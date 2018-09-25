<template>
  <v-footer :absolute="!compact" :app="!compact" v-resize="resized">
    <span class="pa-2" v-html="config.APP_COPYRIGHT"/>
    <v-spacer></v-spacer>
    <span class="pa-2">{{config.APP_NAME}} v{{config.APP_VERSION}}</span>
 </v-footer>
</template>

<script type="text/babel">
  import config from '@/config'
  export default {
    name: 'Footer',
    data () {
      return {
        config,
        compact: true
      }
    },
    methods: {
      resized () {
        switch (this.$vuetify.breakpoint.name) {
          case 'xs':
            this.compact = true
            break
          default:
            this.compact = false
            break
        }
      }
    }
  }
</script>
