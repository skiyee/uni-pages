<script setup lang="ts">
definePageMeta({
  path: 'pages/tabbar/index',
  style: {
    navigationBarTitleText: 'Tabbar页面',
  },
  type: 'home',
  tabbar: {
    index: 0,
    text: '首页',
    iconPath: 'static/tabbar/home.png',
    selectedIconPath: 'static/tabbar/home-selected.png',
  },
})
</script>

<template>
  <view class="container">
    <text>Tabbar页面</text>
  </view>
</template>