export default function NotFound() {
  return (
    <html>
      <body style={{display:"grid",placeItems:"center",minHeight:"100dvh",fontFamily:"ui-sans-serif, system-ui"}}>
        <div style={{textAlign:"center"}}>
          <h1 style={{fontSize:"2rem",marginBottom:"0.5rem"}}>ไม่พบหน้าที่ต้องการ</h1>
          <p style={{opacity:0.7}}>หน้านี้อาจถูกลบหรือย้ายที่แล้ว</p>
        </div>
      </body>
    </html>
  );
}
