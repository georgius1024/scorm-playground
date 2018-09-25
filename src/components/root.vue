<template>
  <v-container>
    <v-flex>
      <v-card class="elevation-4">
        <v-responsive>
          <v-toolbar color="cyan" dark>
            <v-toolbar-title>Objects</v-toolbar-title>
          </v-toolbar>
        </v-responsive>
        <v-card-text>
          <v-list two-line>
            <v-list-tile
                v-for="(item, index) in index"
                :key="index"
                avatar
                :to="{name: 'details', params: {id: item}}"
            >
              <v-list-tile-avatar>
                <v-icon>
                  turned_in
                </v-icon>
              </v-list-tile-avatar>

              <v-list-tile-content>
                <v-list-tile-title
                    v-html="item"
                />
                <!--
                <v-list-tile-sub-title v-html="item.subtitle"></v-list-tile-sub-title>
                -->
              </v-list-tile-content>
            </v-list-tile>
          </v-list>
        </v-card-text>
      </v-card>
    </v-flex>
  </v-container>
</template>
<style>
</style>
<script type="text/babel">
  import Scorm from '@/scorm'
  export default {
    name: 'root',
    data () {
      return {
        index: Scorm.index
      }
    }
  }
</script>