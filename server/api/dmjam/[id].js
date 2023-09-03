export default defineEventHandler(async(event) => {
    const id = getRouterParam(event, 'id')

    const url = `https://github.com/KenZync/O2Jam-Database/raw/main/dmjam/o2ma${id}.ojn`;
    console.log(url)
    const data = await $fetch(url);
    return data
})