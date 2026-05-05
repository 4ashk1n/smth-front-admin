// source: https://gist.github.com/bennettmcelwee/06f0cadd6a41847f848b4bd2a351b6bc?permalink_comment_id=3879708#gistcomment-3879708

export const stringify = (obj: any, depth = 1): string => {
  if (typeof obj === 'string' && isJson(obj)) obj = JSON.parse(obj);
  return !obj
    ? JSON.stringify(obj, null, 2)
    : typeof obj === 'object'
    ? JSON.stringify(
        JSON.parse(
          depth < 1
            ? '"???"'
            : `{${Object.keys(obj)
                .map((k) => `"${k}": ${stringify(obj[k], depth - 1)}`)
                .join(', ')}}`,
        ),
        null,
        2,
      )
    : JSON.stringify(obj, null, 2);
};

function isJson(str: string): boolean {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}
