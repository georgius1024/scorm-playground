import Vue from 'vue'
import Router from 'vue-router'
import root from '@/components/root'
import details from '@/components/details'
import play from '@/components/play'

Vue.use(Router)

export default new Router({

  routes: [
    {
      path: '/',
      name: 'root',
      component: root
    },
    {
      path: '/details/:id',
      name: 'details',
      component: details
    },
    {
      path: '/play/:id',
      name: 'play',
      component: play
    }
  ]

})
