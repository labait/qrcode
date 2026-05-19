
<script setup>
import { onMounted } from 'vue';
import ItemsList from '../components/ItemsList.vue'
import { useGlobal } from '../composables/global';
const global = useGlobal()


onMounted(() => {
 
})
</script>

<template>
  <div class="home-view">
    <ItemsList />
  </div>
</template>


<style scoped>
</style>
