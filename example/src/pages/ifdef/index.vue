<script setup lang="ts">
definePageMeta({
  type: 'page',
  style: {
    // 平台条件编译：直接使用对象字面量，键为平台标识符
    navigationBarTitleText: {
      'mp-weixin': 'Hello 微信',
      'h5': 'Hello H5',
      'app-plus': 'Hello App',
      'default': 'Hello World',
    },
    // 支持组合语法 'platform1 || platform2'
    navigationBarBackgroundColor: {
      'mp-weixin || mp': '#07C160',
      'h5': '#1890FF',
      'default': '#FFFFFF',
    },
  },
})
</script>

<template>
  <view class="container">
    <text class="title">
      ifdef 测试页面
    </text>
    <text class="description">
      当前页面的导航栏标题和背景色会根据平台不同而变化
    </text>
    <view class="platform-info">
      <text>平台条件编译测试：</text>
      <text>- mp-weixin: 标题="Hello 微信", 背景="#07C160"</text>
      <text>- mp-alipay: 标题="Hello World", 背景="#07C160"</text>
      <text>- h5: 标题="Hello H5", 背景="#1890FF"</text>
      <text>- app-plus: 标题="Hello App", 背景="#FFFFFF"</text>
      <text>- 其他: 标题="Hello World", 背景="#FFFFFF"</text>
    </view>
  </view>
</template>

<style>
.container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.description {
  font-size: 14px;
  color: #666;
}

.platform-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.platform-info text {
  font-size: 12px;
  color: #888;
}
</style>
