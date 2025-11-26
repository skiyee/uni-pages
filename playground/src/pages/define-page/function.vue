<script lang="ts" setup>
// t 函数仅作为类型提示，不会被实际调用。
// 函数参数 platform 会被自动注入，表示当前页面所属平台。
definePageMeta(({ platform }) => {
  return {
    style: {
      navigationBarTitleText: `hello from ${platform}`,
    },
    // ...
  }
})
</script>

<template>
  <div>define page in function mode</div>
</template>
