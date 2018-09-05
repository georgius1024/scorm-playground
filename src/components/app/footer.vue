<template>
  <v-footer absolute app>
    <span v-html="config.APP_COPYRIGHT"/>
    <v-spacer></v-spacer>
    <span class="mr-4">{{config.APP_NAME}} v{{config.APP_VERSION}}</span>
 </v-footer>
</template>

<script type="text/babel">
  import config from '@/config'
  export default {
    name: 'Footer',
    data () {
      return {
        config
      }
    }
  }
</script>
