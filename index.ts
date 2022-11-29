import words from "./words.json"
import { buildGraph, InfixGraph } from "./tree"

const LETTER_VALUES: Record<string, number> = {
  a: 1,
  b: 3,
  c: 3,
  d: 2,
  e: 1,
  f: 4,
  g: 2,
  h: 4,
  i: 1,
  j: 8,
  k: 5,
  l: 1,
  m: 3,
  n: 1,
  o: 1,
  p: 3,
  q: 10,
  r: 1,
  s: 1,
  t: 1,
  u: 1,
  v: 4,
  w: 4,
  x: 8,
  y: 4,
  z: 10,
}

type Board = {
  letters: (string | null)[][]
  multipliers: (string | null)[][]
  points: (number | null)[][]
}

type Cell = {
  row: number
  column: number
  letter: string
  isWildcard: boolean
}

let BOARD_WIDTH = 27
let BOARD_HEIGHT = 19

const readBoard = (boardElement: HTMLDivElement): Board => {
  const board: Board = {
    letters: [],
    multipliers: [],
    points: [],
  }
  const rawCells = Array.from(boardElement.children).map(
    (child) => (child as HTMLElement).innerText
  )

  for (let row = 0; row < BOARD_HEIGHT; row++) {
    const letterRow: (string | null)[] = []
    const multiplierRow: (string | null)[] = []
    const pointsRow: (number | null)[] = []
    for (let column = 0; column < BOARD_WIDTH; column++) {
      const cellText = rawCells[row * BOARD_WIDTH + column]

      letterRow[column] = null
      multiplierRow[column] = null
      pointsRow[column] = null

      if (!cellText) {
        continue
      }

      const cell = cellText.split("\n")

      if (cell.length === 1) {
        multiplierRow[column] = cell[0]!
      }

      if (cell.length === 2) {
        letterRow[column] = cell[0]!.toLowerCase()
        pointsRow[column] = parseInt(cell[1]!)
      }

      if (cell.length === 4) {
        multiplierRow[column] = cell[0]!
        letterRow[column] = cell[1]!.toLowerCase()
        pointsRow[column] = parseInt(cell[2]!)
      }
    }
    board.letters[row] = letterRow
    board.points[row] = pointsRow
    board.multipliers[row] = multiplierRow
  }

  return board
}

const getBoardElement = async () => {
  for (;;) {
    const boardElement = Array.from(document.querySelectorAll("div")).find(
      (node) => node.childElementCount >= BOARD_WIDTH * BOARD_HEIGHT
    )
    if (boardElement) return boardElement
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

const main = async () => {
  const uiContainer = document.createElement("div")
  uiContainer.className = "solver-ui"
  document.body.appendChild(uiContainer)

  const graph = await buildGraph(words, (percentage) => {
    uiContainer.innerText =
      "Processing dictionary... " + (percentage * 100).toFixed(2)
  })

  uiContainer.innerText = "Waiting for game to start..."

  let boardElement = await getBoardElement()

  uiContainer.innerText = "Game started."

  const calculateBest = async () => {
    document.querySelectorAll(".highlighted-cell").forEach((element) => {
      element.classList.remove("highlighted-cell")
    })

    boardElement = await getBoardElement()

    BOARD_HEIGHT = parseInt(boardElement.getAttribute("rows")!)
    BOARD_WIDTH = boardElement.childElementCount / BOARD_HEIGHT

    const board: Board = readBoard(boardElement)
    const lettersContainer = document.getElementById(
      "invalid-drop-zone-rack-backdrop"
    )!
    const letters: string[] = Array.from(
      document.querySelectorAll('[aria-label^="Tile with the letter"]')
    )
      .map(
        (elem) =>
          elem
            .getAttribute("aria-label")
            ?.match(/Tile with the letter (.)/)?.[1] ?? " "
      )
      .map((letter) => letter.toLowerCase())

    uiContainer.innerText = "letters: " + letters.join(",").toUpperCase() + "\n"

    const collectWord = (
      word: string,
      row: number,
      column: number,
      dir: "VERTICAL" | "HORIZONTAL"
    ) => {
      if (dir === "HORIZONTAL") {
        let letter
        let pos = column
        while ((letter = board.letters[row]![--pos])) word = letter + word
        pos = column
        while ((letter = board.letters[row]![++pos])) word = word + letter
      } else {
        let letter
        let pos = row
        while ((letter = board.letters[--pos]?.[column])) word = letter + word
        pos = row
        while ((letter = board.letters[++pos]?.[column])) word = word + letter
      }
      return word
    }

    const search = (
      row: number,
      column: number,
      dir: "VERTICAL" | "HORIZONTAL",
      letters: string[],
      node: Record<string, InfixGraph> = graph,
      cells: Cell[] = [],
      originalLength = letters.length,
      visited = new Set<Record<string, InfixGraph>>()
    ): Cell[][] => {
      if (row < 0 || row >= BOARD_HEIGHT) return []
      if (column < 0 || column >= BOARD_WIDTH) return []
      //if (visited.has(node)) return []

      visited.add(node)

      const res: Cell[][] = []
      const gridLetter = board.letters[row]![column]

      if (gridLetter) {
        const nextNode = node[gridLetter]
        const cell: Cell = {
          row,
          column,
          letter: gridLetter,
          isWildcard: false,
        }

        // Cell validity check
        const leftLetter = board.letters[row]?.[column - 1]
        const rightLetter = board.letters[row]?.[column + 1]
        const aboveLetter = board.letters[row - 1]?.[column]
        const belowLetter = board.letters[row + 1]?.[column]

        if (dir === "VERTICAL" && (leftLetter || rightLetter)) {
          const word = collectWord(gridLetter, row, column, "HORIZONTAL")
          if (!graph[word]?.word) return []
        }

        if (dir === "HORIZONTAL" && (aboveLetter || belowLetter)) {
          const word = collectWord(gridLetter, row, column, "VERTICAL")
          if (!graph[word]?.word) return []
        }

        const nextCells = [cell, ...cells]
        if (!nextNode) return []

        let fullWord = true
        if (dir === "VERTICAL") {
          const max = Math.max(...nextCells.map((cell) => cell.row))
          const min = Math.min(...nextCells.map((cell) => cell.row))

          if (board.letters[max + 1]?.[column]) fullWord = false
          if (board.letters[min - 1]?.[column]) fullWord = false

          res.push(
            ...search(
              max + 1,
              column,
              dir,
              letters,
              nextNode.suffix,
              nextCells,
              originalLength,
              visited
            )
          )
          res.push(
            ...search(
              min - 1,
              column,
              dir,
              letters,
              nextNode.prefix,
              nextCells,
              originalLength,
              visited
            )
          )
        } else {
          const max = Math.max(...nextCells.map((cell) => cell.column))
          const min = Math.min(...nextCells.map((cell) => cell.column))

          if (board.letters[row]?.[max + 1]) fullWord = false
          if (board.letters[row]?.[min - 1]) fullWord = false

          res.push(
            ...search(
              row,
              max + 1,
              dir,
              letters,
              nextNode.suffix,
              nextCells,
              originalLength,
              visited
            )
          )
          res.push(
            ...search(
              row,
              min - 1,
              dir,
              letters,
              nextNode.prefix,
              nextCells,
              originalLength,
              visited
            )
          )
        }
        if (fullWord && nextNode.word && originalLength !== letters.length)
          res.push(nextCells)
      } else {
        const letterUsed = new Set<string>()

        for (let i = 0; i < letters.length; i++) {
          const currentLetter = letters[i]!
          const rest = [...letters.slice(0, i), ...letters.slice(i + 1)]
          const isWildcard = currentLetter === " "

          const lettersToTry = isWildcard
            ? Object.keys(LETTER_VALUES)
            : [currentLetter]

          for (const letter of lettersToTry) {
            if (letterUsed.has(letter)) continue
            letterUsed.add(letter)
            const nextNode = node[letter]
            const cell: Cell = { row, column, letter, isWildcard }

            // Cell validity check
            const leftLetter = board.letters[row]?.[column - 1]
            const rightLetter = board.letters[row]?.[column + 1]
            const aboveLetter = board.letters[row - 1]?.[column]
            const belowLetter = board.letters[row + 1]?.[column]

            if (dir === "VERTICAL" && (leftLetter || rightLetter)) {
              const word = collectWord(letter, row, column, "HORIZONTAL")
              if (!graph[word]?.word) continue
            }

            if (dir === "HORIZONTAL" && (aboveLetter || belowLetter)) {
              const word = collectWord(letter, row, column, "VERTICAL")
              if (!graph[word]?.word) continue
            }

            const nextCells = [cell, ...cells]
            if (!nextNode) continue
            let fullWord = true
            if (dir === "VERTICAL") {
              const max = Math.max(...nextCells.map((cell) => cell.row))
              const min = Math.min(...nextCells.map((cell) => cell.row))

              if (board.letters[max + 1]?.[column]) fullWord = false
              if (board.letters[min - 1]?.[column]) fullWord = false

              res.push(
                ...search(
                  max + 1,
                  column,
                  dir,
                  rest,
                  nextNode.suffix,
                  nextCells,
                  originalLength,
                  visited
                )
              )
              res.push(
                ...search(
                  min - 1,
                  column,
                  dir,
                  rest,
                  nextNode.prefix,
                  nextCells,
                  originalLength,
                  visited
                )
              )
            } else {
              const max = Math.max(...nextCells.map((cell) => cell.column))
              const min = Math.min(...nextCells.map((cell) => cell.column))

              if (board.letters[row]?.[max + 1]) fullWord = false
              if (board.letters[row]?.[min - 1]) fullWord = false

              res.push(
                ...search(
                  row,
                  max + 1,
                  dir,
                  rest,
                  nextNode.suffix,
                  nextCells,
                  originalLength,
                  visited
                )
              )
              res.push(
                ...search(
                  row,
                  min - 1,
                  dir,
                  rest,
                  nextNode.prefix,
                  nextCells,
                  originalLength,
                  visited
                )
              )
            }

            if (fullWord && nextNode.word) res.push(nextCells)
          }
        }
      }

      return res
    }
    const startTime = Date.now()
    const results: Cell[][] = []

    if (board.letters.flat().some((letter) => letter !== null)) {
      for (let row = 0; row < BOARD_HEIGHT; row++) {
        for (let column = 0; column < BOARD_WIDTH; column++) {
          if (!board.letters[row]![column]) continue

          const searches = [
            search(row, column, "VERTICAL", letters).map((cells) =>
              cells.sort((a, b) => a.row - b.row)
            ),
            search(row, column, "HORIZONTAL", letters).map((cells) =>
              cells.sort((a, b) => a.column - b.column)
            ),
          ]

          if (board.letters[row + 1]?.[column]) {
            searches.push(
              search(row + 1, column, "VERTICAL", letters).map((cells) =>
                cells.sort((a, b) => a.row - b.row)
              )
            )
          }

          if (board.letters[row - 1]?.[column]) {
            searches.push(
              search(row - 1, column, "HORIZONTAL", letters).map((cells) =>
                cells.sort((a, b) => a.row - b.row)
              )
            )
          }

          if (board.letters[row]?.[column + 1]) {
            searches.push(
              search(row, column + 1, "VERTICAL", letters).map((cells) =>
                cells.sort((a, b) => a.column - b.column)
              )
            )
          }

          if (board.letters[row]?.[column - 1]) {
            searches.push(
              search(row, column - 1, "VERTICAL", letters).map((cells) =>
                cells.sort((a, b) => a.column - b.column)
              )
            )
          }

          for (const cells of searches.flat()) {
            results.push(cells)
          }
        }
      }
    } else {
      uiContainer.innerText += "Initial move\n"
      for (const cells of [
        search(9, 13, "VERTICAL", letters).map((cells) =>
          cells.sort((a, b) => a.row - b.row)
        ),
        search(9, 13, "HORIZONTAL", letters).map((cells) =>
          cells.sort((a, b) => a.column - b.column)
        ),
      ].flat()) {
        results.push(cells)
      }
    }

    const cellsWithScores: { score: number; cells: Cell[] }[] = []
    for (const cells of results) {
      let wordMultiplier = 1
      let score = 0
      let usedLetters = 0

      for (const cell of cells) {
        const existingScore = board.points[cell.row]![cell.column]
        if (typeof existingScore === "number") {
          score += existingScore
          continue
        }
        usedLetters++
        const cellMultiplier = board.multipliers[cell.row]![cell.column]
        let letterMultiplier = 1
        if (cellMultiplier) {
          if (cellMultiplier[1] === "W")
            wordMultiplier *= parseInt(cellMultiplier[0]!)
          if (cellMultiplier[1] === "L")
            letterMultiplier = parseInt(cellMultiplier[0]!)
        }

        if (cell.isWildcard) continue

        score += LETTER_VALUES[cell.letter]! * letterMultiplier
      }
      score *= wordMultiplier
      if (usedLetters === 7) score *= 2
      cellsWithScores.push({
        score,
        cells,
      })
    }

    const endTime = Date.now()

    const bestCells = cellsWithScores.sort((a, b) => b.score - a.score)

    for (const cell of bestCells[0]!.cells) {
      const index = cell.row * BOARD_WIDTH + cell.column
      boardElement.children[index]?.classList.add("highlighted-cell")
      boardElement.children[index]?.classList.toggle(
        "wildcard",
        cell.isWildcard
      )
    }

    const bestWords = bestCells.map(({ score, cells }) => {
      const word = cells.map((cell) => cell.letter).join("")

      return { score, word }
    })

    uiContainer.innerText += `Best word is ${bestWords[0].word.toUpperCase()} (${
      bestWords[0].score
    } points)\n`
    uiContainer.innerText += `Search took ${endTime - startTime}ms`
  }

  uiContainer.addEventListener("click", calculateBest)
}

main()
