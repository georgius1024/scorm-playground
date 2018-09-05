<template>
  <v-app>
    <v-navigation-drawer
      persistent
      :mini-variant="miniVariant"
      :clipped="clipped"
      v-model="drawer"
      enable-resize-watcher
      fixed
      app
    >
      <v-list>
        <v-list-tile
          value="true"
          v-for="(item, i) in items"
          :key="i"
        >
          <v-list-tile-action>
            <v-icon v-html="item.icon"></v-icon>
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title v-text="item.title"></v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>
      </v-list>
    </v-navigation-drawer>
    <v-toolbar
      app
      :clipped-left="clipped"
    >
      <v-toolbar-side-icon @click.stop="drawer = !drawer"></v-toolbar-side-icon>
      <v-btn icon @click.stop="miniVariant = !miniVariant">
        <v-icon v-html="miniVariant ? 'chevron_right' : 'chevron_left'"></v-icon>
      </v-btn>
      <v-btn icon @click.stop="clipped = !clipped">
        <v-icon>web</v-icon>
      </v-btn>
      <v-btn icon @click.stop="fixed = !fixed">
        <v-icon>remove</v-icon>
      </v-btn>
      <v-toolbar-title v-text="title"></v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn icon @click.stop="rightDrawer = !rightDrawer">
        <v-icon>menu</v-icon>
      </v-btn>
    </v-toolbar>
    <v-content>
      <router-view/>
      <v-btn @click="raiseMessage()" v-html="'message'"/>
      <v-btn @click="raiseError()" v-html="'error'"/>
      <v-btn @click="startSpinner" v-html="'Wait'"/>
    </v-content>
    <v-navigation-drawer
      temporary
      :right="right"
      v-model="rightDrawer"
      fixed
      app
    >
      <v-list>
        <v-list-tile @click="right = !right">
          <v-list-tile-action>
            <v-icon>compare_arrows</v-icon>
          </v-list-tile-action>
          <v-list-tile-title>Switch drawer (click me)</v-list-tile-title>
        </v-list-tile>
      </v-list>
    </v-navigation-drawer>
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
