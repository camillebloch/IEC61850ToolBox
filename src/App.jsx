import { parseSCL } from './lib/parseSCL'

function App() {
  const handleFile = (e) => {
    const file = e.target.files[0]
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const result = parseSCL(evt.target.result)
        console.log('Résultat du parsing :', result)
      } catch (err) {
        console.error('Erreur :', err.message)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div>
      <h1>Test parser SCL</h1>
      <input type="file" accept=".ssd,.icd,.xml" onChange={handleFile} />
    </div>
  )
}

export default App