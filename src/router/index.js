import Vue from 'vue'
import Router from 'vue-router'
import root from '@/components/root'
import details from '@/components/details'

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
    }
  ]

})
