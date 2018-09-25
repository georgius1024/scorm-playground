<template>
  <v-app>
    <v-content>
      <router-view/>
    </v-content>
    <!--
    <v-content>
      <p>OLOLOLOLOLO!</p>
      <v-btn @click="raiseMessage()" v-html="'message'"/>
      <v-btn @click="raiseError()" v-html="'error'"/>
      <v-btn @click="startSpinner" v-html="'Wait'"/>
      <v-btn @click="stopSpinner" v-html="'Cancel'"/>
    </v-content>
    -->
    <app-footer />
    <app-message :message="message" :level="level" @closed="message=false"/>
    <app-spinner :active="spinner" :timeout="1000*60" @timeout="timedOut"/>
  </v-app>
</template>

<script>
import AppFooter from '@/components/app/footer'
import AppMessage from '@/components/app/message'
import AppSpinner from '@/components/app/spinner'
import Api from '@/api'

export default {
  data () {
    return {
      message: '',
      level: '',
      spinner: false,
      clipped: false,
      drawer: true,
      fixed: false,
      items: [{
        icon: 'bubble_chart',
        title: 'Inspire'
      }],
      miniVariant: false,
      right: true,
      rightDrawer: false,
      title: 'Vuetify.js'
    }
  },
  created () {
    Api.on('request', () => {
      this.startSpinner()
    })
    Api.on('complete', () => {
      this.stopSpinner()
    })
    Api.on('error', () => {
      this.raiseError(Api.message)
      this.stopSpinner()
    })
    Api.on('message', (message) => {
      this.raiseMessage(message)
    })
  },
  name: 'App',
  methods: {
    raiseMessage (message) {
      this.message = message || 'OLOLOLOLO!!!'
      this.level = ''
    },
    raiseError (error) {
      this.message = error || 'OLOLOLOLO!!!'
      this.level = 'error'
    },
    startSpinner () {
      this.spinner = true
    },
    stopSpinner () {
      this.spinner = true
    },
    timedOut () {
      this.spinner = false
      this.raiseError('Process is timed out')
    }
  },
  components: {
    AppFooter,
    AppMessage,
    AppSpinner
  }
}
</script>
