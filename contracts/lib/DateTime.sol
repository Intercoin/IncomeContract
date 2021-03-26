// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

library DateTime {
       
        /*
         *  Date and Time utilities for ethereum contracts
         *
         */
        struct _DateTime {
                uint256 year;
                uint256 month;
                uint256 day;
                uint256 hour;
                uint256 minute;
                uint256 second;
                uint256 weekday;
        }

        uint256 constant DAY_IN_SECONDS = 86400;
        uint256 constant YEAR_IN_SECONDS = 31536000;
        uint256 constant LEAP_YEAR_IN_SECONDS = 31622400;

        uint256 constant HOUR_IN_SECONDS = 3600;
        uint256 constant MINUTE_IN_SECONDS = 60;

        uint256 constant ORIGIN_YEAR = 1970;

        function isLeapYear(uint256 year) internal pure returns (bool) {
                if (year % 4 != 0) {
                        return false;
                }
                if (year % 100 != 0) {
                        return true;
                }
                if (year % 400 != 0) {
                        return false;
                }
                return true;
        }

        function leapYearsBefore(uint256 year) internal pure returns (uint256) {
                year -= 1;
                return year / 4 - year / 100 + year / 400;
        }

        function getDaysInMonth(uint256 month, uint256 year) internal pure returns (uint256) {
                if (month == 1 || month == 3 || month == 5 || month == 7 || month == 8 || month == 10 || month == 12) {
                        return 31;
                }
                else if (month == 4 || month == 6 || month == 9 || month == 11) {
                        return 30;
                }
                else if (isLeapYear(year)) {
                        return 29;
                }
                else {
                        return 28;
                }
        }

        function parseTimestamp(uint256 timestamp) internal pure returns (_DateTime memory dt) {
                uint256 secondsAccountedFor = 0;
                uint256 buf;
                uint256 i;

                // Year
                dt.year = getYear(timestamp);
                buf = leapYearsBefore(dt.year) - leapYearsBefore(ORIGIN_YEAR);

                secondsAccountedFor += LEAP_YEAR_IN_SECONDS * buf;
                secondsAccountedFor += YEAR_IN_SECONDS * (dt.year - ORIGIN_YEAR - buf);

                // Month
                uint256 secondsInMonth;
                for (i = 1; i <= 12; i++) {
                        secondsInMonth = DAY_IN_SECONDS * getDaysInMonth(i, dt.year);
                        if (secondsInMonth + secondsAccountedFor > timestamp) {
                                dt.month = i;
                                break;
                        }
                        secondsAccountedFor += secondsInMonth;
                }

                // Day
                for (i = 1; i <= getDaysInMonth(dt.month, dt.year); i++) {
                        if (DAY_IN_SECONDS + secondsAccountedFor > timestamp) {
                                dt.day = i;
                                break;
                        }
                        secondsAccountedFor += DAY_IN_SECONDS;
                }

                // Hour
                dt.hour = getHour(timestamp);

                // Minute
                dt.minute = getMinute(timestamp);

                // Second
                dt.second = getSecond(timestamp);

                // Day of week.
                dt.weekday = getWeekday(timestamp);
        }

        function getYear(uint256 timestamp) internal pure returns (uint256) {
                uint256 secondsAccountedFor = 0;
                uint256 year;
                uint256 numLeapYears;

                // Year
                year = uint256(ORIGIN_YEAR + timestamp / YEAR_IN_SECONDS);
                numLeapYears = leapYearsBefore(year) - leapYearsBefore(ORIGIN_YEAR);

                secondsAccountedFor += LEAP_YEAR_IN_SECONDS * numLeapYears;
                secondsAccountedFor += YEAR_IN_SECONDS * (year - ORIGIN_YEAR - numLeapYears);

                while (secondsAccountedFor > timestamp) {
                        if (isLeapYear(uint256(year - 1))) {
                                secondsAccountedFor -= LEAP_YEAR_IN_SECONDS;
                        }
                        else {
                                secondsAccountedFor -= YEAR_IN_SECONDS;
                        }
                        year -= 1;
                }
                return year;
        }

        function getMonth(uint256 timestamp) internal pure returns (uint256) {
                return parseTimestamp(timestamp).month;
        }

        function getDay(uint256 timestamp) internal pure returns (uint256) {
                return parseTimestamp(timestamp).day;
        }

        function getHour(uint256 timestamp) internal pure returns (uint256) {
                return uint256((timestamp / 60 / 60) % 24);
        }

        function getMinute(uint256 timestamp) internal pure returns (uint256) {
                return uint256((timestamp / 60) % 60);
        }

        function getSecond(uint256 timestamp) internal pure returns (uint256) {
                return uint256(timestamp % 60);
        }

        function getWeekday(uint256 timestamp) internal pure returns (uint256) {
                return uint256((timestamp / DAY_IN_SECONDS + 4) % 7);
        }

        function toTimestamp(uint256 year, uint256 month, uint256 day) internal pure returns (uint256 timestamp) {
                return toTimestamp(year, month, day, 0, 0, 0);
        }

        function toTimestamp(uint256 year, uint256 month, uint256 day, uint256 hour) internal pure returns (uint256 timestamp) {
                return toTimestamp(year, month, day, hour, 0, 0);
        }

        function toTimestamp(uint256 year, uint256 month, uint256 day, uint256 hour, uint256 minute) internal pure returns (uint256 timestamp) {
                return toTimestamp(year, month, day, hour, minute, 0);
        }

        function toTimestamp(uint256 year, uint256 month, uint256 day, uint256 hour, uint256 minute, uint256 second) internal pure returns (uint256 timestamp) {
                uint256 i;

                // Year
                for (i = ORIGIN_YEAR; i < year; i++) {
                        if (isLeapYear(i)) {
                                timestamp += LEAP_YEAR_IN_SECONDS;
                        }
                        else {
                                timestamp += YEAR_IN_SECONDS;
                        }
                }

                // Month
                uint256[12] memory monthDayCounts;
                monthDayCounts[0] = 31;
                if (isLeapYear(year)) {
                        monthDayCounts[1] = 29;
                }
                else {
                        monthDayCounts[1] = 28;
                }
                monthDayCounts[2] = 31;
                monthDayCounts[3] = 30;
                monthDayCounts[4] = 31;
                monthDayCounts[5] = 30;
                monthDayCounts[6] = 31;
                monthDayCounts[7] = 31;
                monthDayCounts[8] = 30;
                monthDayCounts[9] = 31;
                monthDayCounts[10] = 30;
                monthDayCounts[11] = 31;

                for (i = 1; i < month; i++) {
                        timestamp += DAY_IN_SECONDS * monthDayCounts[i - 1];
                }

                // Day
                timestamp += DAY_IN_SECONDS * (day - 1);

                // Hour
                timestamp += HOUR_IN_SECONDS * (hour);

                // Minute
                timestamp += MINUTE_IN_SECONDS * (minute);

                // Second
                timestamp += second;

                return timestamp;
        }
}