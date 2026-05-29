# Train Reliability Demonstration

This document demonstrates how the Ceylon Track reliability badges are calculated and rendered. The reliability score is dynamically calculated using the formula:
`Reliability Score = (Count of ON_TIME Trips / Count of Total Trips) * 100`

We classify schedules into three tiers based on this score. Below are sample timetables and their corresponding historic performance data.

---

## 🟩 High Reliability (Usually On Time)
**Score Range: 80% – 100%**

**Train 1014 (Intercity Express)**
* **Route:** Colombo Fort (FOT) → Kandy (KAN)
* **Frequency:** Daily | **Class:** 1st Class

### Scheduled Timetable
| Station | Arrival | Departure | 
| :--- | :--- | :--- | 
| Colombo Fort | 06:00 | 06:00 |
| Ragama | 06:25 | 06:27 |
| Veyangoda | 06:55 | 06:57 |
| Polgahawela | 07:30 | 07:35 |
| Peradeniya Junction | 08:15 | 08:17 |
| Kandy | 08:30 | 08:30 |

### Historical Performance (Last 30 Days)
| Date | Status | Delay | Badge Earned |
| :--- | :--- | :--- | :--- |
| May 28 | ON_TIME | 0 min | |
| May 27 | ON_TIME | 0 min | |
| May 26 | ON_TIME | 0 min | |
| May 25 | DELAYED | 10 min | |
| May 24 | ON_TIME | 0 min | |
| ... | ... | ... | |

* **Total Trips Logged:** 32
* **On Time:** 27 | **Delayed:** 4 | **Cancelled:** 1
* **Calculated Score:** **84%** → 🟩 **USUALLY ON TIME**

---

## 🟧 Moderate Reliability (Sometimes Delayed)
**Score Range: 50% – 79%**

**Train 1084 (Coastal Line)**
* **Route:** Colombo Fort (FOT) → Galle (GAL)
* **Frequency:** Daily | **Class:** Mixed

### Scheduled Timetable
| Station | Arrival | Departure |
| :--- | :--- | :--- |
| Colombo Fort | 07:15 | 07:15 |
| Kalutara North | 08:05 | 08:07 |
| Beruwala | 08:30 | 08:32 |
| Aluthgama | 08:45 | 08:48 |
| Hikkaduwa | 09:20 | 09:22 |
| Galle | 09:45 | 09:45 |

### Historical Performance (Last 30 Days)
| Date | Status | Delay | Badge Earned |
| :--- | :--- | :--- | :--- |
| May 28 | DELAYED | 15 min | |
| May 27 | ON_TIME | 0 min | |
| May 26 | DELAYED | 45 min | |
| May 25 | ON_TIME | 0 min | |
| May 24 | DELAYED | 20 min | |
| ... | ... | ... | |

* **Total Trips Logged:** 32
* **On Time:** 23 | **Delayed:** 8 | **Cancelled:** 1
* **Calculated Score:** **72%** → 🟧 **SOMETIMES DELAYED**

---

## 🟥 Poor Reliability (Often Late)
**Score Range: 0% – 49%**

**Train 1086 (Ruhunu Kumari)**
* **Route:** Colombo Fort (FOT) → Matara (MAT)
* **Frequency:** Daily | **Class:** Mixed

### Scheduled Timetable
| Station | Arrival | Departure |
| :--- | :--- | :--- |
| Colombo Fort | 08:00 | 08:00 |
| (Intermediate Stops) | ... | ... |
| Matara | 11:00 | 11:00 |

### Historical Performance (Last 30 Days)
| Date | Status | Delay | Badge Earned |
| :--- | :--- | :--- | :--- |
| May 28 | ON_TIME | 0 min | |
| May 27 | DELAYED | 25 min | |
| May 26 | ON_TIME | 0 min | |
| May 25 | CANCELLED | - | |
| May 24 | ON_TIME | 0 min | |
| ... | ... | ... | |

* **Total Trips Logged:** 32
* **On Time:** 14 | **Delayed:** 12 | **Cancelled:** 6
* **Calculated Score:** **44%** → 🟥 **OFTEN LATE**
