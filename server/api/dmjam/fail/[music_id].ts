export default defineEventHandler(async (event) => {
    const music_id = getRouterParam(event, "music_id");
    const url = `https://dmjam-rival-system.vercel.app/api/fail/${music_id}`
    const data = await $fetch(url);
    return data
})