import { useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, Stack, TextField, Typography } from '@mui/material'
import { askAdvisor } from '../../services/api'

const suggestions = [
  'How was my business today?',
  'What should I prepare tomorrow?',
  'Which product is most profitable?',
  'How can I increase sales?',
]

function AdvisorPage() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [remainingRequests, setRemainingRequests] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submitQuestion(event) {
    event?.preventDefault()
    if (!question.trim() || submitting) return

    setSubmitting(true)
    setError('')
    setAnswer('')
    try {
      const response = await askAdvisor(question.trim())
      setAnswer(response.data.data.answer)
      setRemainingRequests(response.data.data.remainingRequests)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not reach the AI advisor. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function chooseSuggestion(value) {
    setQuestion(value)
    setAnswer('')
    setError('')
  }

  return (
    <Stack spacing={3} maxWidth={820}>
      <Box>
        <Typography variant="h4" fontWeight={900}>AI Business Advisor</Typography>
        <Typography color="text.secondary">Ask for practical advice based only on your completed sales and current inventory.</Typography>
      </Box>

      <Stack direction="row" flexWrap="wrap" gap={1}>
        {suggestions.map((suggestion) => <Chip key={suggestion} label={suggestion} onClick={() => chooseSuggestion(suggestion)} color={question === suggestion ? 'primary' : 'default'} variant={question === suggestion ? 'filled' : 'outlined'} />)}
      </Stack>

      <Card component="form" onSubmit={submitQuestion}>
        <CardContent>
          <Stack spacing={2}>
            <TextField label="Your business question" value={question} onChange={(event) => setQuestion(event.target.value)} multiline minRows={3} inputProps={{ maxLength: 280 }} helperText={`${question.length}/280 characters`} placeholder="For example: What should I prepare tomorrow?" />
            <Button type="submit" variant="contained" disabled={submitting || !question.trim()} sx={{ alignSelf: 'flex-start' }}>{submitting ? 'Thinking…' : 'Ask advisor'}</Button>
          </Stack>
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}
      {answer && <Card><CardContent><Stack spacing={2}><Box><Typography color="text.secondary" variant="overline">Recommendation</Typography><Typography component="div" sx={{ whiteSpace: 'pre-wrap' }}>{answer}</Typography></Box>{remainingRequests !== null && <Typography variant="caption" color="text.secondary">{remainingRequests} advisor questions remaining in this 15-minute window.</Typography>}</Stack></CardContent></Card>}
      <Alert severity="info">Advice is based on completed-order analytics and inventory only. Free-model requests may be rate-limited.</Alert>
    </Stack>
  )
}

export default AdvisorPage
