<script lang="ts" setup>
import type { HelloWorld } from './utils';

definePageMeta(() => {
  function getTitle(): string {
    const words: HelloWorld = {
      hello: 'hello',
      world: 'world',
    };
    return [words.hello, words.world].join(' ');
  }

  return {
    style: {
      navigationBarTitleText: getTitle(),
    },
    // ...
  };
});
</script>

<template>
  <div>test</div>
</template>
