export default defineEventHandler(async (event) => {
  const files = await readMultipartFormData(event);
  console.log(files)
  if (!files || files.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "File Not Found",
    });
  }
  // console.log(files.length)

  for (let i = 0; i < files.length; i++) {
    if (files[i].name === 'file') {
      const filename = files[i].filename;
      //   const mimetype = files[i].type;
      const data = files[i].data;
    //   const filePath = `./public/${filename}`;
    //   await writeFile(filePath, data);
    console.log(data);
    }
  }
//   console.log(files);

  return {
    message: "success",
  };
  //   const query = getQuery(event)
  //   const ranking = await getRanking();
  //   const data = getPlayerData(ranking,query.user)
  //   return data;
});
