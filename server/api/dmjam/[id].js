export default defineEventHandler(async(event) => {
    const id = getRouterParam(event, 'id')

    const url = `https://github.com/KenZync/O2Jam-Database/raw/main/dmjam/${id}`;
    console.log(url)
    const data = await $fetch(url);
    return data
})