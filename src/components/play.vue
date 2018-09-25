<template>
  <v-container fill-height>
    <v-flex fill-height>
      <v-responsive>
        <v-toolbar color="teal" dark>
          <v-toolbar-title>{{title}}</v-toolbar-title>
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
        title: '',
        slide: false,
        items: [],
        url: ''
      }
    },
    mounted () {
      this.open(this.$route.params.id)
    },
    methods: {
      async open (id) {
        this.id = id
        const s = await Scorm.manifest(id)
        this.title = s.organization.title
        this.items = s.organization.items
        this.slide = this.items.find(e => e.url && e.isvisible === 'true')
        this.url = this.slide ? '/static/scorm/' + this.id + '/' + this.slide.url : 'about://blank'
        const iframe = this.$refs.content
        console.log(iframe)
        iframe.src = this.url
      }
    }
  }
</script>