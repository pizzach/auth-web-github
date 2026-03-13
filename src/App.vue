<script setup>
import { globalLoading } from '@/service/GlobalState';
import ProgressSpinner from 'primevue/progressspinner';
import Toast from 'primevue/toast';
</script>

<template>
    <router-view />
    <Toast />

    <div v-if="globalLoading" class="global-loading-overlay">
        <ProgressSpinner strokeWidth="4" animationDuration=".5s" />
    </div>
</template>

<style>
/* 全域 Spinner 遮罩樣式 */
.global-loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.4);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
}
</style>
