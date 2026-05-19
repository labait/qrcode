<script setup>
import { useRoute } from 'vue-router'
import { useGlobal } from '../composables/global.js'
import { onMounted, ref } from 'vue'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

const route = useRoute()
const global = useGlobal()
const item = ref(null)
const error = ref(null)

async function loadItem() {
	global.loading++
	try {
		const docRef = doc(db, 'items', route.params.id)
		const docSnap = await getDoc(docRef)
		if (docSnap.exists()) {
			item.value = {
				id: docSnap.id,
				...docSnap.data(),
			}
		} else {
			error.value = 'Elemento non trovato'
		}
	} catch (err) {
		error.value = 'Errore nel caricamento dell\'elemento'
		console.error(err)
	} finally {
		global.loading--
	}
}

onMounted(loadItem)
</script>

<template>
	<div class="w-full">
		<div v-if="error" class="rounded-md bg-red-50 p-4 text-red-600">
			{{ error }}
		</div>

		<article v-else-if="item" class="space-y-6">
			<router-link
				:to="{ name: 'home' }"
				class="inline-block text-base font-medium text-neutral-700 hover:text-neutral-900"
			>
				← Torna alla home
			</router-link>

			<!-- Image a fullwidth -->
			<figure v-if="item.image" class="w-full overflow-hidden rounded-md ">
				<img
					:src="item.image"
					:alt="item.title || item.name || 'Item Image'"
					class="w-full h-auto object-cover"
				/>
			</figure>

			<!-- Content -->
			<div class="space-y-4 mt-4">
				<h1 class="text-3xl font-bold">{{ item.name || item.title }}</h1>
				<p class="text-lg text-neutral-700">{{ item.description }}</p>
			</div>
		</article>
	</div>
</template>

<style scoped>
figure {
	margin: 0;
}
</style>
