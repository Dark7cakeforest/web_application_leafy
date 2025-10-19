function navbarActive(presentpage) {
  var i, linkanotherpage;
  //เอาพื้นหลังของปุ่มที่ไม่ใช้งานออก(สำหรับเปลี่ยนcss)
  linkanotherpage = document.getElementsByClassName("linkanotherpage");
  for (i = 0; i < linkanotherpage.length; i++) {
    linkanotherpage[i].classList.remove("active");//ลบคลาส active (ปัจจุบัน) ออก
  }
  document.getElementById(presentpage).classList.add("active");//เพิ่มคลาส active (ปัจจุบัน) เข้าไป
}

//ตั้งค่าให้หน้า Status เป็นหน้าแรกที่แสดง
window.onload = function() {
  navbarActive("Static");
}