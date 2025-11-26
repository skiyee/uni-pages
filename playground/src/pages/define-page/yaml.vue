<script setup lang="ts">
import { parse as yamlParser } from 'yaml';

definePageMeta(() => {
  const yml = `
style:
  navigationBarTitleText: "yaml test"
`;
  return yamlParser(yml);
});

// other codes ....
</script>

<template>
  yaml test
</template>
