export type InfixGraph = {
  name: string
  word: boolean
  suffix: Record<string, InfixGraph>
  prefix: Record<string, InfixGraph>
}

export const buildGraph = async (
  words: string[],
  onProgress: (percentage: number) => void,
  root: Record<string, InfixGraph> = {}
) => {
  let t = Date.now()
  for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
    const word = words[wordIndex]!
    if (Date.now() - t > 30) {
      t = Date.now()
      onProgress(wordIndex / words.length)
      await new Promise((resolve) => window.requestAnimationFrame(resolve))
    }
    // Stupid hack to avoid getting the `constructor` key of an object
    if (word.includes("constructor")) continue

    const letters = word.split("")

    for (let i = 0; i < letters.length; i++) {
      const prefix = letters.slice(0, i)
      const suffix = letters.slice(i + 1)
      const letter = letters[i]!

      let name = letter
      let prevLeaf = root[name] ?? { name, prefix: {}, suffix: {}, word: false }
      root[name] = prevLeaf

      for (let j = prefix.length - 1; j >= 0; j--) {
        const l = prefix[j]!
        name = l + name

        let prefixLeaf = root[name] ?? {
          name,
          prefix: {},
          suffix: {},
          word: false,
        }
        if (name === word) {
          prefixLeaf.word = true
        }
        root[name] = prefixLeaf

        prevLeaf.prefix[l] = prefixLeaf
        prevLeaf = prefixLeaf

        let tempn = name
        for (let k = 0; k < suffix.length; k++) {
          const ll = suffix[k]!
          const prfxlf = root[tempn] ?? {
            name,
            prefix: {},
            suffix: {},
            word: false,
          }
          tempn = tempn + ll
          let suffixLeaf = root[tempn] ?? {
            name: tempn,
            prefix: {},
            suffix: {},
            word: false,
          }
          root[tempn] = suffixLeaf

          if (tempn === word) {
            suffixLeaf.word = true
          }

          prfxlf.suffix[ll] = suffixLeaf
        }
      }

      name = letter
      prevLeaf = root[name]!

      for (let j = 0; j < suffix.length; j++) {
        const l = suffix[j]!
        name = name + l

        let suffixLeaf = root[name] ?? {
          name,
          prefix: {},
          suffix: {},
          word: false,
        }

        if (name === word) {
          suffixLeaf.word = true
        }
        root[name] = suffixLeaf
        prevLeaf.suffix[l] = suffixLeaf
        prevLeaf = suffixLeaf

        let tempn = name
        for (let k = prefix.length - 1; k >= 0; k--) {
          const ll = prefix[k]!
          let sfxlf = root[tempn] ?? {
            name,
            prefix: {},
            suffix: {},
            word: false,
          }

          if (tempn === word) {
            sfxlf.word = true
          }

          tempn = ll + tempn

          let prefixLeaf = root[tempn] ?? {
            name: tempn,
            prefix: {},
            suffix: {},
            word: false,
          }
          root[tempn] = prefixLeaf

          if (tempn === word) {
            prefixLeaf.word = true
          }

          sfxlf.prefix[ll] = prefixLeaf
        }
      }
    }
  }
  return root
}
