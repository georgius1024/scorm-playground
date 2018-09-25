<template>
  <v-container>
    <v-flex>
      <v-card class="elevation-4">
        <v-responsive>
          <v-toolbar color="teal" dark>
            <v-toolbar-title>{{ title }}</v-toolbar-title>
          </v-toolbar>
        </v-responsive>
        <v-card-text>
          {{title}} ({{id}})
          <v-divider/>
          <v-list two-line>
            <v-list-tile
                v-for="(item, index) in items"
                :key="index"
                avatar
                @click=""
            >
              <v-list-tile-avatar>
                <v-icon>
                  turned_in
                </v-icon>
              </v-list-tile-avatar>

              <v-list-tile-content>
                <v-list-tile-title
                    v-html="item.title"
                />
              </v-list-tile-content>
            </v-list-tile>
          </v-list>

        </v-card-text>
        <v-card-actions>
          <v-btn
              block
              :to="{name: 'root'}"
          >
            Назад
          </v-btn>
        </v-card-actions>
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
        id: '',
        title: '',
        items: []
      }
    },
    watch: {
      '$route' (to) {
        this.open(to.params.id)
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
        // console.log(s)
      }
    }
  }
</script>