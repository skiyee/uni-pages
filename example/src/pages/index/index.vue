<script setup lang="ts">
import { ref } from 'vue'

const title = ref('Hello')

definePageMeta({
  type: 'home',
  style: {
    // 平台条件编译：直接使用对象字面量
    navigationBarTitleText: {
      'h5': 'Hello web',
      'default': 'Hello',
    },
    animationType: 'slide-in-bottom',
  },
})
</script>

<template>
  <view class="content">
    <image class="logo" src="/static/logo.png" />
    <view class="text-area">
      <text class="title">
        {{ title }} 123
      </text>
    </view>
  </view>
</template>

<style>
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.logo {
  height: 200rpx;
  width: 200rpx;
  margin-top: 200rpx;
  margin-left: auto;
  margin-right: auto;
  margin-bottom: 50rpx;
}

.text-area {
  display: flex;
  justify-content: center;
}

.title {
  font-size: 36rpx;
  color: #8f8f94;
}
</style>
