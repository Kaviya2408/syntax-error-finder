// Test script to verify API is working
const testCode = `public class Test {
    public static void main(String[] args) {
       int a[]={1,2,3};
       System.out.println(a[5]);
    }
}`;

fetch('http://localhost:3001/api/check', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ code: testCode }),
})
.then(response => response.json())
.then(data => {
  console.log('API Response:', JSON.stringify(data, null, 2));
})
.catch(error => {
  console.error('API Error:', error);
});
