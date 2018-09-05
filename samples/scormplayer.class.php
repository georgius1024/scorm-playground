<?
/// Класс для работы со SCROM-пакетами версия 1.2
class SCORM12
{
  var $structureItems = false;
  var $currentSlideRef = false;
  var $folderName = false;
  var $manifest = false;
  var $resources = array();
  var $title = false;
  var $metadata = array();

  function canMoveNext()
  {
    $point = $this -> currentSlideRef;
    $steps = $this -> structureItems -> GetTree();
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
    $steps = $this -> structureItems -> GetTree();
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
    $steps = $this -> structureItems -> GetTree();
    foreach($steps as $step)
      if ($step['data']['href'])
        $cnt++;
    return (bool)($cnt > 1);
  }
  
  function moveFirst()
  {
    $this -> currentSlideRef = false;
    $steps = $this -> structureItems -> GetTree();
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
    $steps = $this -> structureItems -> GetTree();
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
    $steps = $this -> structureItems -> GetTree();
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
    $steps = $this -> structureItems -> GetTree();
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
    if ($this-> structureItems -> GetItem($ref))  
      $this -> currentSlideRef = $ref;
    return $this -> currentSlideRef;
  }
  
  function getCurrentSlide()
  {
    if (!$this -> currentSlideRef)
      $this -> moveFirst();
    return $this-> structureItems -> GetItem($this -> currentSlideRef);
  }
  
  function SCORM12($folderName)
  {
    $this -> folderName = $folderName;
    $this -> manifest = simplexml_load_file($this -> folderName . 'imsmanifest.xml');
    
    // Ресурсы
    $this -> resources = array();
    $temp = $this -> manifest -> resources -> resource;
    foreach($temp as $item)
    {
       $identifier = $this -> nodeValue($item['identifier']);
       $href = $this -> nodeValue($item['href']);
       $this -> resources[$identifier] = $href;
    }
    
    // Структура
    $manifestId = $this -> nodeValue($this -> manifest['identifier']);
    $rootOrg = $this -> manifest -> organizations -> organization[0];
    $this -> title = $this -> nodeValue($rootOrg -> title);
    $rootId = 'root'; 
    $this -> structureItems = new Tree();
    $this -> structureItems -> SetRoot($rootId, $this -> title);
    $this -> traverseItems($rootId, $rootOrg -> item); //// Рекурсивный обход
    $this -> structureItems -> ExpandAll();
    $this -> currentItem = $this -> structureItems -> GetRoot();
    
    // Метаданные
    $meta = $this -> manifest -> metadata;
    $this -> metadata['schema'] = $this -> nodeValue($meta -> schema);
    $this -> metadata['schemaversion'] = $this -> nodeValue($meta -> schemaversion);
    $this -> metadata['identifier']  = $manifestId;
    $this -> metadata['title']  = $this -> title;
  }
  
  function traverseItems($rootId, $items)
  {
    foreach($items as $item)
    {
      $itemId = $this -> nodevalue($item['identifier']); 
      $itemName = $this -> nodeValue($item -> title);
      $ref = $this -> nodevalue($item['identifierref']);
      $href = $this -> resources[$ref];
      $attrs = array();
      $temp = $item -> attributes();
      foreach($temp as $n => $v)
        $attrs[$n] = $this -> nodeValue($v);
      $attrs['href'] = $href;
      $this -> structureItems -> AddItem($rootId, $itemId, $itemName, $attrs);
      if (count($item -> item))
        $this -> traverseItems($itemId, $item -> item);
    }
  }
  
  function nodeValue($node)
  {
    return iconv("UTF-8", "windows-1251", (string)$node);
  }

}



?>