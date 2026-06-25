import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/features',
    },
    {
      path: '/features',
      name: 'features',
      redirect: () => {
        const slug = localStorage.getItem('lastFeatureSlug')
        return slug ? `/features/${slug}` : '/features'
      },
    },
    {
      path: '/features/:slug',
      name: 'feature-detail',
      component: () => import('@/views/FeatureDetailView.vue'),
      beforeEnter: (to) => {
        localStorage.setItem('lastFeatureSlug', to.params.slug as string)
      },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
    },
  ],
})

export default router
