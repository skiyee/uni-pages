<script setup lang="ts">
import { onError, onHide, onLaunch, onShow } from '@dcloudio/uni-app';

onLaunch(() => {
  console.log('App Launch');
});
onShow(() => {
  console.log('App Show');
});
onHide(() => {
  console.log('App Hide');
});
onError((e) => {
  console.log(e);

});
</script>

<style></style>
