// https://jsperf.com/date-getdayofyear-perf/2

// XXXddahl: fixed this code 'd = this.getDate(); was 'd = this.getDay();'
(function () {

  Date.prototype.isLeapYear = function _isLeapYear () {
    yr = this.getFullYear();
    return !((yr % 4) || (!(yr % 100) && (yr % 400)));
  };
  
  Date.prototype.getDayOfYear = function _getDayOfYear() {
    var dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var m = this.getMonth(),
        d = this.getDate();
    var day = dayCount[m] + d;
    if(m > 1 && this.isLeapYear()) day++;
    return day;
  };

})();
