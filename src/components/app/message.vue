<template>
  <v-snackbar
    top
    right
    multi-line
    :timeout="timeout"
    :color="color"
    v-model="gotMessage"
    @input="closed"
  >
    <span v-html="message"></span>
    <v-btn dark icon flat @click.native="closed">
      <v-icon>
        clear
      </v-icon>
    </v-btn>
  </v-snackbar>
</template>
<script>
  export default {
    data () {
      return {
        gotMessage: false
      }
    },
    watch: {
      message: function (value) {
        this.gotMessage = Boolean(value)
      }
    },
    computed: {
      color () {
        return this.level === 'error' ? 'error' : 'info'
      }
    },
    props: {
      message: {
        default: false
      },
      level: {
        default: false
      },
      timeout: {
        type: Number,
        default: 6000
      }
    },
    methods: {
      closed () {
        this.gotMessage = false
        this.$emit('closed')
      }

    }
  }
</script>

