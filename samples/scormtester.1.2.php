<?php

DEFINE('RESOURSESPATH', './resources/individual/');
DEFINE('RESOURSESURL', 'resource.php/individual/');

//// Одностраничное SCORM-задание
require_once(INCLUDEPATH . 'bbtapp.inc');
require_once(SHAREDPATH  . 'response.html.inc');
require_once(SHAREDPATH  . 'tree.inc');
require_once(SHAREDPATH  . 'html.outline.inc');

class SCORMTask extends HtmlResponse
{
  var $resourceId = false;
  var $sessionId  = false;
  var $folderName = false;
  var $organizationTree = false;
  var $currentSlideRef = false;
  
  var $manifest = false;
  var $taskTitle = false;
  var $meta = array();
  
  var $sessionData = array();
  
  function uploadSCORM()
  {
    if (!$_FILES['upload'])
    {
      BBTApp::Message('Укажите ZIP-файл, содержащий SCORM-пакет.');
      return Request::Redirect(false);
    }
    if (!is_uploaded_file($_FILES['upload']['tmp_name'])) 
    {
      BBTApp::Message('Невозможно принять файл! Наиболее вероятная причина - слишком большой для загрузки.');
      return Request::Redirect(false);
    }  
    
    if (strtolower(fileextention($_FILES['upload']['name'])) <> 'zip')
    {
      BBTApp::Message('Невозможно принять файл! Причина - файл имеет неподходящее расширение (требуется zip).');
      return Request::Redirect(false);
    }
    if (!is_dir(RESOURSESPATH))
      mkdir(RESOURSESPATH);
    $dir = RESOURSESPATH . Context::Get('PERS_ID');
    if (!is_dir($dir))
      mkdir($dir);
    
    $zip = new ZipArchive();
    if ($zip -> open($_FILES['upload']['tmp_name']) === TRUE) 
    {
      $zip -> extractTo($dir);
      $zip -> close();
    }
    else 
    {
      BBTApp::Message('Невозможно принять файл! Причина - файл не распаковывается.');
      return Request::Redirect(false);
    }

    $test =  @simplexml_load_file($dir . '/imsmanifest.xml');
    if (!$test)
    {
      BBTApp::Message('Невозможно принять файл! Причина - пакет сформирован неверно, файл манифеста испорчен!');
      return Request::Redirect(false);
    }
      
    return Request::Redirect(false);
  }
  
  function checkDataTables()
  {
    DB::Exec(
    "CREATE TABLE IF NOT EXISTS [PRE]LMS_SESSION (
      SESSION  VARCHAR(40) NOT NULL,
      RESOURCE VARCHAR(40) NOT NULL,
      PERS_ID INT NOT NULL,
      STARTED DATETIME,
      FINISHED DATETIME,
      STATUS VARCHAR(20),
      PRIMARY KEY (SESSION),
      INDEX IX_LMS_SESSION_PERSON(PERS_ID, FINISHED),
      INDEX IX_LMS_SESSION_FINISHED(FINISHED)
    );", True);
    DB::Exec(
    "CREATE TABLE IF NOT EXISTS [PRE]LMS_VARS (
      SESSION  VARCHAR(40) NOT NULL,
      NAME VARCHAR(255) NOT NULL,
      VALUE TEXT,
      PRIMARY KEY (SESSION, NAME)
    );", True);
  }
  
  function storeSessionToContext()
  {
    return Context::Set('TASKDATA[' . $this -> sessionId . ']', $this -> sessionData); /// Save changes in session vars
  }
  
    function storeSessionToDB()
  {

    $this -> checkDataTables();
    if ($this -> sessionId)
    {
      $sessionId = addslashes($this -> sessionId);
      $resourceId = addslashes($this -> resourceId);
      if ($this -> sessionData['LMS.start.TS'])
        $started = "'" . TS2SQL($this -> sessionData['LMS.start.TS']) . "'";
      else
        $started = 'null';
      if ($this -> sessionData['LMS.finish.TS'])
        $finished = "'" . S2SQL($this -> sessionData['LMS.finish.TS']) . "'" ;
      else
        $finished = 'null';
      $persId = (int)$this -> sessionData['cmi.core.student_id'];
      $status = addslashes($this -> sessionData['lesson_status']);
      DB::Exec('DELETE FROM [PRE]LMS_SESSION WHERE SESSION="' . $sessionId . '"');
      DB::Exec('DELETE FROM [PRE]LMS_VARS WHERE SESSION="' . $sessionId . '"');
      DB::Exec('INSERT INTO [PRE]LMS_SESSION 
        (`SESSION`,
        `RESOURCE`,
        `PERS_ID`,
        `STARTED`,
        `FINISHED`,
        `STATUS`)
        VALUES(' . 
        "'{$sessionId}', '{$resourceId}', {$persId}, {$started}, {$finished}, '{$status}'" . 
        ')');
      foreach($this -> sessionData as $k => $v)
      {
        $name  = addslashes($k);
        $value = addslashes($v);
        DB::Exec('INSERT INTO [PRE]LMS_VARS
          (`SESSION`,
          `NAME`,
          `VALUE`)
          VALUES
          (' . "'{$sessionId}', '{$name}', '{$value}'" . ')');
      }
    }
    return $this -> storeSessionToContext();
  }
  
  function loadSessionFromDB()
  {
    $this -> checkDataTables();
    $this -> sessionData = array();
    if ($this -> sessionId)
    {
      $sessionId = mysql_real_escape_string($this -> sessionId);
      $vars = DB::SelectAll('SELECT * FROM [PRE]LMS_VARS WHERE SESSION = "' . $sessionId . '"');
      foreach($vars as $item)
      {
        $this -> sessionData[$item['NAME']] = $item['VALUE'];
      }
    }
    return $this -> sessionData;
  }
  
  function ProcessRequest()
  {
    $this -> openResource(Context::Get('PERS_ID'));
    if ($this -> manifest)
      $this -> openSession(Context::Get('PERS_ID'));
    
    if (Request::Posted())
    {
      if (Request::Post('action') == 'upload')
      {
        return $this -> uploadSCORM();
      }  
       //// Первый проход - весь массив измененных переменных сохраняем в сессии;
      $previousStateData = $this -> sessionData; /// Запомним предыдущее состояние
      $vars = $_POST['vars'];
      $clientAction = stripslashes($_POST['action']);
      foreach($vars as $element => $value)
      {
        $this -> sessionData[stripslashes($element)] = stripslashes($value); //// За раз изменяется одна переменная
      }
      $requestAction = false;
      
      switch($clientAction)
      {
        case 'initialize': /// LMS Init
          $this -> sessionData['cmi.core.session_time'] = '0000:00:00.00';
          break;
        case 'finalize': /// LMS Finish
          /// Вычисление cmi.core.total_time
          $time = explode(':', $this -> sessionData['cmi.core.session_time']);
          $sessionTime = $time[0] * 3600 + $time[1] * 60 + $time[2];
          $time = explode(':', $this -> sessionData['cmi.core.total_time']);
          $totalTime = $time[0] * 3600 + $time[1] * 60 + $time[2];
          $totalTime += $sessionTime;
          $h = intval($totalTime / 3600);
          $s = $totalTime % 60;
          $m = intval(($totalTime % 3600) / 60);
          $this -> sessionData['cmi.core.total_time'] = sprintf("%04d:%02d:%02d", $h, $m, $s);
          $this -> sessionData['cmi.core.session_time'] = '0000:00:00.00';
          /// Разбираемся со статусами
          if ($this -> sessionData['cmi.core.lesson_status'] == 'not attempted')
          {
            $this -> sessionData['cmi.core.lesson_status'] = 'incomplete';
          }
          /// Если есть score и установлено правило для masteryscore, идет сравнение
          if ($this -> sessionData['adlcp:masteryscore'] && $this -> sessionData['cmi.core.score.raw'])
          {
            if ($this -> sessionData['cmi.core.score.raw'] >= $this -> sessionData['adlcp:masteryscore']) 
              $this -> sessionData['cmi.core.lesson_status'] = 'passed';
            else
              $this -> sessionData['cmi.core.lesson_status'] = 'failed';
          }
          if ($this -> sessionData['cmi.core.exit'] !== 'suspend') /// Не требуется сохранять итоги
          {
            $this -> sessionData['cmi.core.lesson_location'] = '';
            $this -> sessionData['cmi.suspend_data'] = '';
          }
          if (
            ($this -> sessionData['cmi.core.lesson_status'] == 'passed') || 
            ($this -> sessionData['cmi.core.lesson_status'] == 'failed') ||
            ($this -> sessionData['cmi.core.lesson_status'] == 'completed'))
          {
            $this -> sessionData['LMS.closed']  = true;
            $requestAction = 'reload';
          }
          break;
        default:
          break;
      }
      
      
        
      /// Подсчет времени и фиксация последней активности
      if ($this -> sessionData['LMS.lastActivity.TS']) // Была активность
      {
        $delta = microtime(true) - (float)$this -> sessionData['LMS.lastActivity.TS'];
        $this -> sessionData['LMS.duration.TS'] += $delta; 
      }
      $this -> sessionData['LMS.lastActivity.DT'] = format_datetime(time()); 
      $this -> sessionData['LMS.lastActivity.TS'] = microtime(true); 
      
      $this -> storeSessionToDB(); 
       
      /// Отправляем новый вектор SESSIONDATA клиенту 
      Header('Content-Type: application/json');
      $response = array('vars' => $this -> sessionData, 'action' => $requestAction);
      echo(json_safe_encode($response));
      /*
      /// Логирование
      $f = fopen('LMS.LOG', 'a');
      fputs($f, ">>" . json_safe_encode(StripQuotes($_POST)) . "\n"); 
      fputs($f, "<<" . json_safe_encode($response) . "\n"); 
      */
      die(); // Более ничего не выводим и не делаем
    }
    
    if (Request::Get('SLIDE_ID'))
    {
      $this -> navigateSessionToSlide(Request::Get('SLIDE_ID'));
      $this -> storeSessionToDB();
      Request::Redirect(false);
    }  
    
    if (Request::Get('resetlesson'))
    {
      $this -> startNewSession();
      $this -> storeSessionToDB();
      Request::Redirect(false);
    }

    if (Request::Get('clearlesson'))
    {
      $dir = RESOURSESPATH . Context::Get('PERS_ID') . '/';
      clearDir($dir);
      $this -> startNewSession();
      $this -> storeSessionToDB();
      Request::Redirect(false);
    }
    
  }
  
  function PerformResponse()
  {
    global $TplMaster;
    $TplMaster -> Bind('SESSION_ID', $this -> sessionId);
    $TplMaster -> Bind('COURSE_NAME', '');
    $TplMaster -> Bind('SLIDE_NAME', '');
    $TplMaster -> Bind('SLIDE_REF', '');
    $TplMaster -> Bind('SLIDE_HREF', '');
    $TplMaster -> Bind('CAN_MOVE_PREV', false);
    $TplMaster -> Bind('CAN_MOVE_NEXT', false);
    $TplMaster -> Bind('CAN_SELECT', false);
    if ($this -> sessionId)
    {
      
      if (!$this -> moveTo($this -> sessionData['LMS.slide']))
        $this -> moveFirst();

      if (Request::Get('move') == 'prev')
      {
        $this -> movePrev();
        Request::Redirect(false, 'SLIDE_ID=' . $this -> currentSlideRef);
      }
      if (Request::Get('move') == 'next')
      {
        $this -> moveNext();
        Request::Redirect(false, 'SLIDE_ID=' . $this -> currentSlideRef);
      }
        
      $curentStep = $this -> getCurrentSlide();
      $TplMaster -> Bind('SESSION_ID', $this -> sessionId);
      $TplMaster -> Bind('COURSE_NAME', $this -> taskTitle);
      $TplMaster -> Bind('SLIDE_NAME', $curentStep['name']);
      $TplMaster -> Bind('SLIDE_REF', $curentStep['key']);
      $TplMaster -> Bind('SLIDE_HREF', $curentStep['data']['href']);
      $TplMaster -> Bind('CAN_MOVE_PREV', $this -> canMovePrev());
      $TplMaster -> Bind('CAN_MOVE_NEXT', $this -> canMoveNext());
      $TplMaster -> Bind('CAN_SELECT', $this -> canSelect());
      /*
      if ($curentStep['data']['parameters'])
        $curentStep['data']['parameters'] .= '&CPinsideRH=true';
      else
        $curentStep['data']['parameters'] = '?CPinsideRH=true';
       */
      $urlFolder = RESOURSESURL . $this -> resourceId . '/';
      //$TplMaster -> Bind('PAGE_TO_GO', $this -> folderName . $curentStep['data']['href'] . $curentStep['data']['parameters']);
      $TplMaster -> Bind('PAGE_TO_GO', $urlFolder . $curentStep['data']['href'] . $curentStep['data']['parameters']);
      $junk = new Outline($this -> organizationTree, $this -> sessionData['LMS.slide'], false, false,  'COURSETREE');
        
      $TplMaster -> Bind($this -> metadata);
      if (!$this -> sessionData['LMS.closed'])
        $TplMaster -> Process('CONTENT');
      else
        $TplMaster -> Process('CONTENT_CLOSED');
    }
    else
        $TplMaster -> Process('CONTENT_NOT_SELECTED');
    
  }

  function openSession($id)
  {
    $this -> sessionId = $id;
    if ($this -> loadSessionFromDB()) // Сессия сохранена
    {
      $this -> continueSession();
    }
    else /// Новая сессия
    {
      $this -> startNewSession();
    }
    $this -> storeSessionToContext();
  }

  function startNewSession()
  {
    $this -> sessionData = array();
    $this -> sessionData['sessionId'] = $this -> sessionId;
    
    $this -> sessionData['cmi.core.lesson_status']   = 'not attempted'; 
    $this -> sessionData['cmi.core.entry']           = 'ab-initio'; 
    $this -> sessionData['cmi.core.credit']          = 'credit'; 
    $this -> sessionData['cmi.core.lesson_mode']     = 'normal'; 

    $this -> sessionData['cmi.core.student_id']      = Context::Get('PERS_ID'); 
    $this -> sessionData['cmi.core.student_name']    = Context::Get('PERSON'); 
    
    $this -> sessionData['cmi.core.total_time']     = '0000:00:00'; 
    
    $this -> sessionData['cmi.core.lesson_location'] = '';
    $this -> sessionData['cmi.suspend_data'] = '';
    $this -> sessionData['cmi.launch_data'] = '';
    
    $this -> sessionData['LMS.start.DT']             = format_datetime(time()); 
    $this -> sessionData['LMS.start.TS']             = microtime(true); 
    $this -> sessionData['LMS.duration.TS']          = 0; 
    $this -> sessionData['LMS.closed']               = false;
    
  }
  
  function continueSession()  
  {
    $this -> sessionData['cmi.core.entry']           = 'resume'; 
  }
  
  function navigateSessionToSlide($id)
  {
    $this -> sessionData['LMS.slide'] = $id; 
    $this -> sessionData['cmi.core.lesson_location'] = '';
    $this -> sessionData['cmi.suspend_data'] = '';

    ///Context::Set('TASKDATA[' . $this -> sessionId . ']', $this -> sessionData); /// Save changes in session vars
  }
  
  function openResource($id)
  {
    $this -> resourceId = $id;
    $this -> folderName = RESOURSESPATH . $this -> resourceId . '/';
    
    $this -> manifest = @simplexml_load_file($this -> folderName . 'imsmanifest.xml');
    if (!$this -> manifest)
    {
      return false;
    }  
      
    $manifestId = $this -> nodeValue($this -> manifest['identifier']);
    $ns = $this -> manifest -> getNamespaces(true);
    
    // Ресурсы
    global $SCORM_RESOURCES;
    $SCORM_RESOURCES = array();
    $temp = $this -> manifest -> resources -> resource;
    foreach($temp as $item)
    {
       $identifier = $this -> nodeValue($item['identifier']);
       $href = $this -> nodeValue($item['href']);
       $SCORM_RESOURCES[$identifier] = $href;
    }
    
    // Организация 
    $defaultOrg = $this -> nodeValue($this -> manifest -> organizations['default']);
    foreach($this -> manifest -> organizations as $rootOrg)
    {
      if ($rootOrg['identifier'] == $defaultOrg)
        break;
    }
    /// Если не нашли организацию, то будет первая по списку
    if ($rootOrg['identifier'] != $defaultOrg)
      $rootOrg = $this -> manifest -> organizations -> organization[0];
      
    $this -> taskTitle = $this -> nodeValue($rootOrg -> title);
    
    $rootId = 'root'; 
    $this -> organizationTree = new Tree();
    $this -> organizationTree -> SetRoot($rootId, $this -> taskTitle);
    $this -> traverseItems($rootId, $rootOrg -> item); //// Рекурсивный обход
    $this -> organizationTree -> ExpandAll();
    $this -> moveFirst(); // После загрузки у нас активен первый слайд
    
    // Метаданные
    $meta = $this -> manifest -> metadata;
    $this -> metadata['schema'] = $this -> nodeValue($meta -> schema);
    $this -> metadata['schemaversion'] = $this -> nodeValue($meta -> schemaversion);
    $this -> metadata['identifier']  = $manifestId;
    $this -> metadata['title']  = $this -> taskTitle;
  }
  
  function traverseItems($rootId, $items)
  {
    global $SCORM_RESOURCES;
    foreach($items as $item)
    {
      $itemId = $this -> nodevalue($item['identifier']); 
      $itemName = $this -> nodeValue($item -> title);
      $ref = $this -> nodevalue($item['identifierref']);
      $href = $SCORM_RESOURCES[$ref];
      $attrs = array();
      $temp = $item -> attributes();
      foreach($temp as $n => $v)
        $attrs[$n] = $this -> nodeValue($v);
      $attrs['href'] = $href;
      $this -> organizationTree -> AddItem($rootId, $itemId, $itemName, $attrs);
      if (count($item -> item))
        $this -> traverseItems($itemId, $item -> item);
    }
  }
  
  function nodeValue($node)
  {
    return iconv("UTF-8", "windows-1251", (string)$node);
  }
  
  function canMoveNext()
  {
    $point = $this -> currentSlideRef;
    $steps = $this -> organizationTree -> GetTree();
    $takeNext = false;
    foreach($steps as $step)
    {
      if ($step['key'] == $point)
        $takeNext = true;
      else if ($takeNext && $step['data']['href'])
        return true;
    }
    return false;
  }
  
  function canMovePrev()
  {
    $point = $this -> currentSlideRef;
    $steps = $this -> organizationTree -> GetTree();
    $steps = array_reverse($steps);
    $takeNext = false;
    foreach($steps as $step)
    {
      if ($step['key'] == $point)
        $takeNext = true;
      else if ($takeNext && $step['data']['href'])
        return true;
    }
    return false;
  }
  
  function canSelect()
  {
    $cnt = 0;
    $steps = $this -> organizationTree -> GetTree();
    foreach($steps as $step)
      if ($step['data']['href'])
        $cnt++;
    return (bool)($cnt > 1);
  }
  
  function moveFirst()
  {
    $this -> currentSlideRef = false;
    $steps = $this -> organizationTree -> GetTree();
    foreach($steps as $step)
    {
      if ($step['data']['href'])
      {
        $this -> currentSlideRef = $step['key'];
        break;
      }  
    }
    return $this -> currentSlideRef;
  }

  function moveLast()
  {
    $this -> currentSlideRef = false;
    $steps = $this -> organizationTree -> GetTree();
    $steps = array_reverse($steps);
    foreach($steps as $step)
    {
      if ($step['data']['href'])
      {
        $this -> currentSlideRef = $step['key'];
        break;
      }  
    }
    return $this -> currentSlideRef;
  }

  function moveNext()
  {
    $point = $this -> currentSlideRef;
    $this -> currentSlideRef = false;
    $steps = $this -> organizationTree -> GetTree();
    $takeNext = false;
    foreach($steps as $step)
    {
      if ($step['key'] == $point)
        $takeNext = true;
      else if ($takeNext && $step['data']['href'])
      {
        $this -> currentSlideRef = $step['key'];
        break;
      }
    }
    return $this -> currentSlideRef;
  }
  
  function movePrev()
  {
    $point = $this -> currentSlideRef;
    $this -> currentSlideRef = false;
    $steps = $this -> organizationTree -> GetTree();
    $steps = array_reverse($steps);
    $takeNext = false;
    foreach($steps as $step)
    {
      if ($step['key'] == $point)
        $takeNext = true;
      else if ($takeNext && $step['data']['href'])
      {
        $this -> currentSlideRef = $step['key'];
        break;
      }
    }
    return $this -> currentSlideRef;
  }
  
  function moveTo($ref)
  {
    $this -> currentSlideRef = false;
    if ($this-> organizationTree -> GetItem($ref))  
      $this -> currentSlideRef = $ref;
    return $this -> currentSlideRef;
  }
  
  function getCurrentSlide()
  {
    if (!$this -> currentSlideRef)
      $this -> moveFirst();
    return $this-> organizationTree -> GetItem($this -> currentSlideRef);
  }
  
}

BBTApp::Init();
BBTapp::CheckAuth(); 
BBTApp::CheckAccess(ACCESS_ADMIN);
BBTApp::Run(new SCORMTask('Задание SCORM'));
BBTApp::Done();

function clearDir($dirName)
{
  if (is_dir($dirName))
  {
    $dir = opendir($dirName); 
    while (($file = readdir($dir)) !== false) 
    { 
      if (($file != '.') && ($file != '..'))
      {
        if (is_dir($dirName . '/'. $file)) 
          clearDir($dirName . '/' . $file);
        else
          unlink($dirName . '/' . $file); 
      }
    } 
    closedir($dir);
    rmdir($dirName);
  }
}



/*  
  $manifest = simplexml_load_file('C:\WWWR00T\sdoproftest\resources\003\imsmanifest.xml');
  $ns = $manifest -> getNamespaces(true);
  $adlcp = $ns["adlcp"];
  
  
  $meta = $manifest -> metadata;
  
  $child = $meta -> children($ns["adlcp"]);
  //dump($child);
  foreach ($child->location as $out_ns)
  {
    dump($out_ns . '');
      echo $out_ns;
  }

  //dump($ns);
*/  
  /*
  $doc = new DOMDocument();
  $doc -> load('C:\WWWR00T\sdoproftest\resources\003\imsmanifest.xml');  
  $meta = $doc -> getElementsByTagName('metadata');
  $meta = $meta -> item(0);
  foreach($meta as $k=> $v)
  {
    dump($k);
    dump($v);
  }
  foreach($meta -> childNodes as $node)
  {
    dump($node);
  }
  //dump($meta -> childNodes);
  */
?>
