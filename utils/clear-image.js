const fs = require("fs");
const path = require("path");

const clearImage = (imageUrl) => {
  fs.unlink(path.join(__dirname, "..", imageUrl), (err) =>
    console.log(
      err
        ? "FS_CLEAR_IMAGE_FAILED" + err
        : "FS_IMAGE_SUCCESSFULY_REMOVED - " + imageUrl
    )
  );
};

module.exports = {
  clearImage,
};
