<template>
  <v-container fill-height>
    <v-flex fill-height>
      <v-responsive>
        <v-toolbar color="teal" dark>
          <v-toolbar-title>
            {{title}}
          </v-toolbar-title>

          <v-spacer/>
          {{slideNo + 1}} / {{validSlides}}
          {{status}}
          <v-toolbar-items>
            <v-btn flat @click="restart">
              <v-icon>
                refresh
              </v-icon>
            </v-btn>
            <v-btn flat @click="selectFirstSlide" :disabled="slideNo === firstSlideIndex">
              <v-icon>
                first_page
              </v-icon>
            </v-btn>
            <v-btn flat @click="selectPrevSlide" :disabled="slideNo === firstSlideIndex">
              <v-icon>
                chevron_left
              </v-icon>
            </v-btn>
            <v-btn flat @click="selectNextSlide" :disabled="slideNo === lastSlideIndex">
              <v-icon>
                chevron_right
              </v-icon>
            </v-btn>
            <v-btn flat @click="selectLastSlide":disabled="slideNo === lastSlideIndex">
              <v-icon>
                last_page
              </v-icon>
            </v-btn>
          </v-toolbar-items>

          <v-spacer/>
          <v-btn icon :to="{name: 'root'}">
            <v-icon >
              clear
            </v-icon>
          </v-btn>
        </v-toolbar>
      </v-responsive>
      <iframe ref="content" class="content" frameborder="0">

      </iframe>
    </v-flex>
  </v-container>
</template>
<style>
  .content {
    width: 100%;
    /*height: 1280px;*/
    height: calc(100% - 65px);
    background-color: red;
  }
</style>
<script type="text/babel">
  import Scorm from '@/scorm'
  export default {
    name: 'play',
    data () {
      return {
        id: '0',
        manifest: {},
        title: '',
        slideNo: -1,
        items: [],
        url: '',
        status: 'idle',
        simple: true
      }
    },
    computed: {
      currentSlide () {
        return this.items[this.slideNo]
      },
      firstSlideIndex () {
        return this.items.findIndex(e => e.url)
      },
      lastSlideIndex () {
        return this.items.length - this.items.slice().reverse().findIndex(e => e.url)
      },
      nextSlideIndex () {
        return this.items.findIndex((e, idx) => e.url && idx > this.slideNo)
      },
      prevSlideIndex () {
        return this.items.slice().reverse().findIndex((e, idx) => e.url && (this.items.length - idx) < this.slideNo)
      },
      validSlides () {
        return this.items.reduce((sum, e) => sum += e.url ? 1 : 0, 0)
      }
    },
    mounted () {
      this.open(this.$route.params.id)
    },
    methods: {
      selectFirstSlide () {
        this.slideNo = this.firstSlideIndex
        this.reloadSlide()
      },
      selectNextSlide () {
        this.slideNo = this.nextSlideIndex
        this.reloadSlide()
      },
      selectPrevSlide () {
        this.slideNo = this.prevSlideIndex
        this.reloadSlide()
      },
      selectLastSlide () {
        this.slideNo = this.lastSlideIndex
        this.reloadSlide()
      },
      reloadSlide () {
        this.url = this.currentSlide ? '/static/scorm/' + this.id + '/' + this.currentSlide.url : 'about://blank'
        const iframe = this.$refs.content
        iframe.src = this.url
      },
      restart () {
        this.selectFirstSlide()
        this.status = 'active'
        Scorm.initializeSession(this.manifest, '101', (data) => {
          this.status = data['cmi.core.lesson_status']
          alert(data['cmi.core.lesson_status'] + ' in ' + data['cmi.core.total_time'])
        })
      },
      async open (id) {
        this.id = id
        this.manifest = await Scorm.manifest(id)
        this.title = this.manifest.organization.title
        this.items = this.manifest.organization.items
        this.restart()
      }
    }
  }
</script>