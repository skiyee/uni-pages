<script lang="ts" setup>
import pagesJson from 'virtual:pages-json';

console.log(pagesJson);

definePageMeta({
  style: {
    navigationBarTitleText: 'hello world',
  },
  tabbar: {},
  // ...
});
</script>

<template>
  <div>test</div>
</template>
