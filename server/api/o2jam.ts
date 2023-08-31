// import useSupabase from '~/public/o2ma785.ojn'


export default defineEventHandler(async(event) => {

    const data: ArrayBuffer = await $fetch(`http://127.0.0.1:3000/o2ma785.ojn`, { responseType: "arrayBuffer" });

    // console.log(data.byteLength)

    // const binaryData = await data.arrayBuffer();
    // console.log(data)

    return data
})