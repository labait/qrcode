<script setup>
import { useGlobal } from '../composables/global.js'
import { useRouter } from 'vue-router'
import { onMounted, ref } from 'vue'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase.js'

const global = useGlobal()
const router = useRouter()
const items = ref([])

async function loadItems() {
	global.loading++

	try {
		const snapshot = await getDocs(collection(db, 'items'))
		items.value = snapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}))
	} finally {
		global.loading--
	}
}

function goToDetail(itemId) {
	router.push({ name: 'itemDetail', params: { id: itemId } })
}

onMounted(loadItems)
</script>

<template>
	<section class="w-full space-y-4">
		<h2 class="text-xl font-semibold">Items</h2>
		<p v-if="items.length === 0" class="text-base opacity-85">
			Nessun elemento trovato nella collezione items.
		</p>

		<div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
			<article
				v-for="item in items"
				:key="item.id"
				class="rounded-md bg-white cursor-pointer mb-4"
				@click="goToDetail(item.id)"
			>
				<figure>
					<img
						v-if="item.image"
						:src="item.image"
						:alt="item.title || 'Item Image'"
						class="h-80 w-full object-cover grayscale hover:grayscale-0 transition duration-300 rounded-md mb-2"
					/>
				</figure>
				<h3 class="font-medium ">{{ item.name || item.title || item.id }}</h3>
				<p class="mt-1 text-base opacity-90">{{ item.description }}</p>
			</article>
		</div>
	</section>
</template>
