import { createHash } from 'crypto';
export default defineEventHandler(async(event) => {
    const id = getRouterParam(event, 'id')

    const hash = createHash('sha256');
    hash.update(`o2ma${id}.ojn`);
    const hashDigest = hash.digest('hex').toUpperCase();

    const url = `https://github.com/KenZync/O2Jam-Database/raw/main/dmjam/${hashDigest}`;
    console.log(url)
    const data = await $fetch(url);
    return data
})