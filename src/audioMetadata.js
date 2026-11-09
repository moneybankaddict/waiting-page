// Parsing local only: the audio and its tags are never sent to an external service.
export async function readAudioMetadata(blob) {
  const { parseBlob, selectCover } = await import('music-metadata');
  const { common } = await parseBlob(blob, { duration: false });
  const picture = selectCover(common.picture);
  const format = picture?.format?.toLowerCase();
  const cover = picture && ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'].includes(format)
    ? await trimLetterbox(new Blob([picture.data], { type: format }))
    : null;

  return {
    title: common.title?.trim() || '',
    artist: common.artists?.filter(Boolean).join(', ') || common.artist?.trim() || common.albumartist?.trim() || '',
    cover,
  };
}

// Many covers are video stills padded with black bars; crop them so the artwork fills its frame.
async function trimLetterbox(image) {
  try {
    const bitmap = await createImageBitmap(image);
    const { width, height } = bitmap;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0);
    const { data } = context.getImageData(0, 0, width, height);
    const threshold = 12;

    const lineIsDark = (start, step, count) => {
      let total = 0;
      for (let i = 0; i < count; i++) {
        const p = (start + i * step) * 4;
        total += data[p] * .299 + data[p + 1] * .587 + data[p + 2] * .114;
      }
      return total / count < threshold;
    };
    const rowDark = y => lineIsDark(y * width, 1, width);
    const columnDark = x => lineIsDark(x, width, height);

    let top = 0, bottom = height - 1, left = 0, right = width - 1;
    while (top < bottom && rowDark(top)) top++;
    while (bottom > top && rowDark(bottom)) bottom--;
    while (left < right && columnDark(left)) left++;
    while (right > left && columnDark(right)) right--;

    const cropWidth = right - left + 1;
    const cropHeight = bottom - top + 1;
    bitmap.close();
    // Leave untouched when there is nothing to trim, or when the image is mostly dark artwork.
    if (cropWidth === width && cropHeight === height) return image;
    if (cropWidth < width * .3 || cropHeight < height * .3) return image;

    const output = document.createElement('canvas');
    output.width = cropWidth;
    output.height = cropHeight;
    output.getContext('2d').drawImage(canvas, left, top, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    return await new Promise(resolve => output.toBlob(result => resolve(result || image), 'image/jpeg', .92));
  } catch {
    return image;
  }
}
