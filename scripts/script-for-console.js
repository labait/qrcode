;(`lastname.6780@laba.edu`
.match(/\d+(?=@)/g) || [])
.forEach((code) => {
  const id = parseInt(code, 10)
  ;[...document.querySelectorAll('.badge')]
    .find((el) => el.textContent.includes(`(${id})`))
    ?.querySelector('a.registerAttendance')
    ?.click();

})