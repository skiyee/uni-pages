<script lang="ts" setup>
definePageMeta(async () => {
  function fetchTitle(): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve('hello world from async');
      }, 100);
    });
  }

  const title = await fetchTitle();

  return {
    style: {
      navigationBarTitleText: title,
    },
    // ...
  };
});
</script>

<template>
  <div>test</div>
</template>
