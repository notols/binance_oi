// fetch API 사용 예시
fetch('http://localhost:3000/api/alerts/threshold', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ threshold: 1 }) // 임계값을 30%로 변경
  })
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));