-- MySQL dump 10.13  Distrib 5.5.46, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: lobster
-- ------------------------------------------------------
-- Server version	5.5.46-0ubuntu0.14.04.2

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `code`
--

DROP TABLE IF EXISTS `code`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `code` (
  `name` varchar(30) NOT NULL,
  `code` text NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `code`
--

LOCK TABLES `code` WRITE;
/*!40000 ALTER TABLE `code` DISABLE KEYS */;
/*!40000 ALTER TABLE `code` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `code_directories`
--

DROP TABLE IF EXISTS `code_directories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `code_directories` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` char(20) NOT NULL,
  `parent` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=8 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `code_directories`
--

LOCK TABLES `code_directories` WRITE;
/*!40000 ALTER TABLE `code_directories` DISABLE KEYS */;
/*!40000 ALTER TABLE `code_directories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `code_f14`
--

DROP TABLE IF EXISTS `code_f14`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `code_f14` (
  `name` varchar(30) NOT NULL,
  `code` text NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `code_f14`
--

LOCK TABLES `code_f14` WRITE;
/*!40000 ALTER TABLE `code_f14` DISABLE KEYS */;
/*!40000 ALTER TABLE `code_f14` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `code_f15`
--

DROP TABLE IF EXISTS `code_f15`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `code_f15` (
  `name` varchar(30) NOT NULL,
  `code` text NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `code_f15`
--

LOCK TABLES `code_f15` WRITE;
/*!40000 ALTER TABLE `code_f15` DISABLE KEYS */;
/*!40000 ALTER TABLE `code_f15` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `code_w15`
--

DROP TABLE IF EXISTS `code_w15`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `code_w15` (
  `name` varchar(30) NOT NULL,
  `code` text NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `code_w15`
--

LOCK TABLES `code_w15` WRITE;
/*!40000 ALTER TABLE `code_w15` DISABLE KEYS */;
/*!40000 ALTER TABLE `code_w15` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_code`
--

DROP TABLE IF EXISTS `course_code`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `course_code` (
  `course` varchar(30) NOT NULL,
  `name` varchar(30) NOT NULL,
  `code` text NOT NULL,
  `isVisible` tinyint(1) NOT NULL,
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`course`,`name`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_code`
--

LOCK TABLES `course_code` WRITE;
/*!40000 ALTER TABLE `course_code` DISABLE KEYS */;
/*!40000 ALTER TABLE `course_code` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `logActions`
--

DROP TABLE IF EXISTS `logActions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `logActions` (
  `actionId` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `logId` bigint(20) unsigned NOT NULL,
  `action` char(10) NOT NULL,
  `ts` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `data` text,
  PRIMARY KEY (`actionId`),
  KEY `logId` (`logId`)
) ENGINE=MyISAM AUTO_INCREMENT=21243006 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `logActions`
--

LOCK TABLES `logActions` WRITE;
/*!40000 ALTER TABLE `logActions` DISABLE KEYS */;
/*!40000 ALTER TABLE `logActions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `logs`
--

DROP TABLE IF EXISTS `logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `logs` (
  `logId` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uniqname` char(8) NOT NULL,
  `ts` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`logId`),
  KEY `uniqname` (`uniqname`)
) ENGINE=MyISAM AUTO_INCREMENT=47774 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `logs`
--

LOCK TABLES `logs` WRITE;
/*!40000 ALTER TABLE `logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `queue`
--

DROP TABLE IF EXISTS `queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `queue` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(50) NOT NULL,
  `queueId` int(11) NOT NULL,
  `name` varchar(30) NOT NULL,
  `location` varchar(50) NOT NULL,
  `description` varchar(100) NOT NULL,
  `ts` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=11546 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `queue`
--

LOCK TABLES `queue` WRITE;
/*!40000 ALTER TABLE `queue` DISABLE KEYS */;
/*!40000 ALTER TABLE `queue` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `queueAdmins`
--

DROP TABLE IF EXISTS `queueAdmins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `queueAdmins` (
  `courseId` varchar(30) NOT NULL,
  `email` varchar(50) NOT NULL,
  PRIMARY KEY (`courseId`,`email`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `queueAdmins`
--

LOCK TABLES `queueAdmins` WRITE;
/*!40000 ALTER TABLE `queueAdmins` DISABLE KEYS */;
/*!40000 ALTER TABLE `queueAdmins` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `queueCourses`
--

DROP TABLE IF EXISTS `queueCourses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `queueCourses` (
  `courseId` varchar(30) NOT NULL,
  `shortName` varchar(30) NOT NULL,
  `fullName` varchar(200) NOT NULL,
  PRIMARY KEY (`courseId`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `queueCourses`
--

LOCK TABLES `queueCourses` WRITE;
/*!40000 ALTER TABLE `queueCourses` DISABLE KEYS */;
/*!40000 ALTER TABLE `queueCourses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `queueMessages`
--

DROP TABLE IF EXISTS `queueMessages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `queueMessages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `postId` int(11) NOT NULL,
  `sender` varchar(50) NOT NULL,
  `target` varchar(50) NOT NULL,
  `message` text NOT NULL,
  `ts` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=360 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `queueMessages`
--

LOCK TABLES `queueMessages` WRITE;
/*!40000 ALTER TABLE `queueMessages` DISABLE KEYS */;
/*!40000 ALTER TABLE `queueMessages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `queueSchedule`
--

DROP TABLE IF EXISTS `queueSchedule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `queueSchedule` (
  `queueId` int(11) NOT NULL,
  `day` tinyint(4) NOT NULL,
  `schedule` char(48) NOT NULL,
  PRIMARY KEY (`queueId`,`day`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `queueSchedule`
--

LOCK TABLES `queueSchedule` WRITE;
/*!40000 ALTER TABLE `queueSchedule` DISABLE KEYS */;
/*!40000 ALTER TABLE `queueSchedule` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `queues`
--

DROP TABLE IF EXISTS `queues`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `queues` (
  `queueId` int(11) NOT NULL AUTO_INCREMENT,
  `courseId` varchar(30) NOT NULL,
  `location` varchar(100) NOT NULL,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`queueId`)
) ENGINE=MyISAM AUTO_INCREMENT=16 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `queues`
--

LOCK TABLES `queues` WRITE;
/*!40000 ALTER TABLE `queues` DISABLE KEYS */;
/*!40000 ALTER TABLE `queues` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stack`
--

DROP TABLE IF EXISTS `stack`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stack` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(50) NOT NULL,
  `queueId` int(11) NOT NULL,
  `name` varchar(30) NOT NULL,
  `location` varchar(50) NOT NULL,
  `description` varchar(100) NOT NULL,
  `ts` timestamp NULL DEFAULT NULL,
  `tsRemoved` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=11546 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stack`
--

LOCK TABLES `stack` WRITE;
/*!40000 ALTER TABLE `stack` DISABLE KEYS */;
/*!40000 ALTER TABLE `stack` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `userActions`
--

DROP TABLE IF EXISTS `userActions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `userActions` (
  `actionId` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `logId` bigint(20) unsigned NOT NULL,
  `action` char(10) NOT NULL,
  `ts` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `data` text,
  PRIMARY KEY (`actionId`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `userActions`
--

LOCK TABLES `userActions` WRITE;
/*!40000 ALTER TABLE `userActions` DISABLE KEYS */;
/*!40000 ALTER TABLE `userActions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_code`
--

DROP TABLE IF EXISTS `user_code`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_code` (
  `uniqname` varchar(100) NOT NULL,
  `name` varchar(30) NOT NULL,
  `code` text NOT NULL,
  `isPublic` tinyint(1) NOT NULL DEFAULT '0',
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`uniqname`,`name`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_code`
--

LOCK TABLES `user_code` WRITE;
/*!40000 ALTER TABLE `user_code` DISABLE KEYS */;
INSERT INTO `user_code` VALUES ('jjuett@umich.edu','program','\nvoid assert(bool b);\n\nint main(){\n  \n}',0,'2017-01-31 15:43:25'),('jjuett@umich.edu','regression','int global = 3; \n \n// REQUIRES: str1 and str2 point to C-strings\n// EFFECTS:  If st1 and str2 are identical (contain exactly\n//           the same characters), returns 0.\n//           If the first differing character has a greater\n//           value in str1 than in str2, return a positive number.\n//           Otherwise, return a negative number.\nint strcmp_eecs280(const char *str1, const char *str2){\n\n  // Make auxiliary pointers to move. Note: technically\n  // we could just use str1 and str2 directly in this case.\n  const char *ptr1 = str1; \n  const char *ptr2 = str2;\n\n  // Advance both pointers to first mismatched characters.\n  while (*ptr1 && *ptr1 == *ptr2) {\n    ++ptr1;\n    ++ptr2;\n  }\n\n  // Subtract characters to get a difference. If positive,\n  // it means str1 is greater, negative means str2 is greater,\n  // zero means equal.\n  return *ptr1 - *ptr2;\n\n}\n\n\nvoid test_cstring() {\n\n  char str1[7] = \"lizard\";\n  char str2[7] = \"lizard\";\n  char str3[7] = \"turtle\";\n  char str4[8] = \"turtles\";\n  char str5[5] = \"frog\";\n  char str6[1] = \"\";\n   \n  assert(strcmp_eecs280(str3, str5) > 0); \n  assert(strcmp_eecs280(str3, str4) < 0); \n  assert(strcmp_eecs280(str6, str5) < 0); \n  assert(strcmp_eecs280(str1, str2) == 0); \n\n}\n\n// REQUIRES: there are at least n elements in arr\n// MODIFIES: cout\n// EFFECTS:  Prints out n elements from arr\n// NOTE:     You must use traversal by index.\nvoid printArrayIndex(const int arr[], int n){\n  for(int i = 0; i < n; ++i){\n    cout << arr[i] << \" \";\n  }\n}\n\n// REQUIRES: there are at least n elements in arr\n// MODIFIES: cout\n// EFFECTS:  Prints out n elements from arr\n// NOTE:     You must use traversal by pointer.\nvoid printArrayPointer(const int arr[], int n){  \n  for(const int *ptr = arr; ptr < arr + n; ++ptr){\n    cout << *ptr << \" \";\n  }\n}\n\n// REQUIRES: there are at least n elements in arr\n// MODIFIES: arr\n// EFFECTS:  all elements are \"shifted\" right by one unit\n//           for example, [0,1,3,3,4]\n//           would become [4,0,1,3,3]\n// NOTE:     You must use traversal by pointer.\n//           You may not use an extra array.\nvoid slideRight(int arr[], int n){\n  int last = arr[n-1];\n  \n  for(int *ptr = arr+n-2; ptr >= arr; --ptr){\n    *(ptr+1) = *ptr;\n  }\n  arr[0] = last;\n}\n\n// REQUIRES: there are at least n elements in arr\n// MODIFIES: arr\n// EFFECTS:  the order of elements in row is reversed\n//           for example, [1,2,3,4,5]\n//           would become [5,4,3,2,1]\n// NOTE:     You must use traversal by pointer.\n//           You may not use an extra array.\nvoid flip(int arr[], int n){\n  int *left = arr;\n  int *right = arr+n-1;\n  while (left < right){\n    int temp = *left;\n    *left = *right;\n    *right = temp;\n    ++left;\n    --right;\n  }\n}\n\n// REQUIRES: there are at least n elements in arr\n//           the elements of arr are sorted in ascending order\n//           there may be duplicates\n// MODIFIES: arr\n// EFFECTS:  Returns the number of unique elements and now arr\n//           begins with those unique elements in sorted order.\n//           The rest of the array doesn\'t matter.\n// NOTE:     You must use traversal by pointer.\n//           Your solution must be in-place and run in linear time.\nint removeDuplicates(int arr[], int n){\n  int *done = arr;\n  int *next = done+1;\n  while(next < arr+n){\n    if (*next == *done){\n      ++next;\n    }\n    else{\n      *++done = *next++;\n    }\n  }\n  return done - arr + 1;\n}\n\nvoid test_arrays(){\n  int arr1[5] = {0,1,3,3,4};\n  \n  //cout << \"Testing printArrayIndex:\" << endl;\n  //cout << \" Solution: 0 1 3 3 4 \" << endl;\n  //cout << \"Your code: \"; printArrayIndex(arr1,5); cout << endl;\n  \n  cout << \"Testing printArrayPointer:\" << endl;\n  cout << \" Solution: 0 1 3 3 4 \" << endl;\n  cout << \"Your code: \"; printArrayPointer(arr1,5); cout << endl;\n  \n  cout << \"Testing slideRight: \" << endl;\n  cout << \" Solution: 4 0 1 3 3 \" << endl;\n  slideRight(arr1,5);\n  cout << \"Your code: \"; printArrayPointer(arr1,5); cout << endl;\n  \n  int arr2[5] = {1,2,3,4,5};\n  cout << \"Testing flip:\" << endl;\n  cout << \" Solution: 5 4 3 2 1 \" << endl;\n  flip(arr2,5);\n  cout << \"Your code: \"; printArrayPointer(arr2,5); cout << endl;\n  \n  int arr3[10] = {1,3,3,4,4,4,5,7,9,9};\n  cout << \"Testing removeDuplicates:\" << endl;\n  cout << \" Solution: 1 3 4 5 7 9 \" << endl;\n  int num = removeDuplicates(arr3,10);\n  cout << \"Your code: \"; printArrayPointer(arr3,num); cout << endl;\n  \n}\n\nvoid test_static_storage_duration_helper(int &out){\n  static int x = 3; // TODO BROKEN\n  out = x;\n  ++x;\n  cout << x << endl;\n}\n\nvoid test_static_storage_duration() {\n  \n  assert(global == 3);\n  \n  int x = 1;\n  test_static_storage_duration_helper(x);\n  assert(x == 3);\n  test_static_storage_duration_helper(x);\n  //assert(x == 4); // TODO BROKEN\n  \n}\n\nint main() {\n\n  test_cstring();\n  test_arrays();\n  \n 	test_static_storage_duration();\n  \n  cout << \"DONE\" << endl;\n}\n\n',0,'2017-01-31 23:57:28'),('james.juett@gmail.com','program','int x = 3;\nint main(){\n  cout << x;\n}',0,'2017-02-03 05:36:53'),('jjuett@umich.edu','temp','const int MAX_MATRIX_WIDTH = 500;\nconst int MAX_MATRIX_HEIGHT = 500;\n\n// Representation of a 2D matrix of integers\n// Matrix objects may be copied.\nstruct Matrix{\n  int width;\n  int height;\n  int data[25];\n};\n\n/* Image.h\n * Originally written by James Juett at the University of Michigan\n * for project 3 in EECS 280, Winter 2016.\n */\n\n// Representation of an RGB Pixel used for\n// parameter passing and returns by the\n// Image module. This is a POD type.\nstruct Pixel {\n  int r;\n  int g;\n  int b;\n};\n \nconst int MAX_INTENSITY = 255;\n\n// Representation of 2D RGB image.\n// Image objects may be copied.\nstruct Image {\n  int width;\n  int height;\n  Matrix red_channel;\n  Matrix green_channel;\n  Matrix blue_channel;\n};\n\nint main(){\n  Image img;\n  \n  \n}',0,'2017-02-05 15:10:19'),('jjuett@umich.edu','regression2','int global = 3; \n \n// REQUIRES: str1 and str2 point to C-strings\n// EFFECTS:  If st1 and str2 are identical (contain exactly\n//           the same characters), returns 0.\n//           If the first differing character has a greater\n//           value in str1 than in str2, return a positive number.\n//           Otherwise, return a negative number.\nint strcmp_eecs280(const char *str1, const char *str2){\n\n  // Make auxiliary pointers to move. Note: technically\n  // we could just use str1 and str2 directly in this case.\n  const char *ptr1 = str1; \n  const char *ptr2 = str2;\n\n  // Advance both pointers to first mismatched characters.\n  while (*ptr1 && *ptr1 == *ptr2) {\n    ++ptr1;\n    ++ptr2;\n  }\n\n  // Subtract characters to get a difference. If positive,\n  // it means str1 is greater, negative means str2 is greater,\n  // zero means equal.\n  return *ptr1 - *ptr2;\n\n}\n\n\nvoid test_cstring() {\n\n  char str1[7] = \"lizard\";\n  char str2[7] = \"lizard\";\n  char str3[7] = \"turtle\";\n  char str4[8] = \"turtles\";\n  char str5[5] = \"frog\";\n  char str6[1] = \"\";\n   \n  assert(strcmp_eecs280(str3, str5) > 0); \n  assert(strcmp_eecs280(str3, str4) < 0); \n  assert(strcmp_eecs280(str6, str5) < 0); \n  assert(strcmp_eecs280(str1, str2) == 0); \n\n}\n\n// REQUIRES: there are at least n elements in arr\n// MODIFIES: cout\n// EFFECTS:  Prints out n elements from arr\n// NOTE:     You must use traversal by index.\nvoid printArrayIndex(const int arr[], int n){\n  for(int i = 0; i < n; ++i){\n    cout << arr[i] << \" \";\n  }\n}\n\n// REQUIRES: there are at least n elements in arr\n// MODIFIES: cout\n// EFFECTS:  Prints out n elements from arr\n// NOTE:     You must use traversal by pointer.\nvoid printArrayPointer(const int arr[], int n){  \n  for(const int *ptr = arr; ptr < arr + n; ++ptr){\n    cout << *ptr << \" \";\n  }\n}\n\n// REQUIRES: there are at least n elements in arr\n// MODIFIES: arr\n// EFFECTS:  all elements are \"shifted\" right by one unit\n//           for example, [0,1,3,3,4]\n//           would become [4,0,1,3,3]\n// NOTE:     You must use traversal by pointer.\n//           You may not use an extra array.\nvoid slideRight(int arr[], int n){\n  int last = arr[n-1];\n  \n  for(int *ptr = arr+n-2; ptr >= arr; --ptr){\n    *(ptr+1) = *ptr;\n  }\n  arr[0] = last;\n}\n\n// REQUIRES: there are at least n elements in arr\n// MODIFIES: arr\n// EFFECTS:  the order of elements in row is reversed\n//           for example, [1,2,3,4,5]\n//           would become [5,4,3,2,1]\n// NOTE:     You must use traversal by pointer.\n//           You may not use an extra array.\nvoid flip(int arr[], int n){\n  int *left = arr;\n  int *right = arr+n-1;\n  while (left < right){\n    int temp = *left;\n    *left = *right;\n    *right = temp;\n    ++left;\n    --right;\n  }\n}\n\n// REQUIRES: there are at least n elements in arr\n//           the elements of arr are sorted in ascending order\n//           there may be duplicates\n// MODIFIES: arr\n// EFFECTS:  Returns the number of unique elements and now arr\n//           begins with those unique elements in sorted order.\n//           The rest of the array doesn\'t matter.\n// NOTE:     You must use traversal by pointer.\n//           Your solution must be in-place and run in linear time.\nint removeDuplicates(int arr[], int n){\n  int *done = arr;\n  int *next = done+1;\n  while(next < arr+n){\n    if (*next == *done){\n      ++next;\n    }\n    else{\n      *++done = *next++;\n    }\n  }\n  return done - arr + 1;\n}\n\nvoid test_arrays(){\n  int arr1[5] = {0,1,3,3,4};\n  \n  //cout << \"Testing printArrayIndex:\" << endl;\n  //cout << \" Solution: 0 1 3 3 4 \" << endl;\n  //cout << \"Your code: \"; printArrayIndex(arr1,5); cout << endl;\n  \n  cout << \"Testing printArrayPointer:\" << endl;\n  cout << \" Solution: 0 1 3 3 4 \" << endl;\n  cout << \"Your code: \"; printArrayPointer(arr1,5); cout << endl;\n  \n  cout << \"Testing slideRight: \" << endl;\n  cout << \" Solution: 4 0 1 3 3 \" << endl;\n  slideRight(arr1,5);\n  cout << \"Your code: \"; printArrayPointer(arr1,5); cout << endl;\n  \n  int arr2[5] = {1,2,3,4,5};\n  cout << \"Testing flip:\" << endl;\n  cout << \" Solution: 5 4 3 2 1 \" << endl;\n  flip(arr2,5);\n  cout << \"Your code: \"; printArrayPointer(arr2,5); cout << endl;\n  \n  int arr3[10] = {1,3,3,4,4,4,5,7,9,9};\n  cout << \"Testing removeDuplicates:\" << endl;\n  cout << \" Solution: 1 3 4 5 7 9 \" << endl;\n  int num = removeDuplicates(arr3,10);\n  cout << \"Your code: \"; printArrayPointer(arr3,num); cout << endl;\n  \n}\n\nvoid test_static_storage_duration_helper(int &out){\n  static int x = 3; // TODO BROKEN\n  out = x;\n  ++x;\n  cout << x << endl;\n}\n\nvoid test_static_storage_duration() {\n  \n  assert(global == 3);\n  \n  int x = 1;\n  test_static_storage_duration_helper(x);\n  assert(x == 3);\n  test_static_storage_duration_helper(x);\n  //assert(x == 4); // TODO BROKEN\n  \n}\n\nint main() {\n\n  test_cstring();\n  test_arrays();\n  \n 	test_static_storage_duration();\n  \n  cout << \"DONE\" << endl;\n}\n\n',0,'2017-02-07 18:27:02'),('jjuett@umich.edu','ifTest','int main() {\n \n  int x = 3;\n  if (x = 2) {\n    cout << \"hello\" << endl;\n  }\n  \n  if(x == 2 ){\n    cout << \"hi alex\" << endl;\n  }\n}',0,'2017-02-07 18:41:07'),('jjuett@umich.edu','p2','const int MAX_MATRIX_WIDTH = 500;\nconst int MAX_MATRIX_HEIGHT = 500;\n\n// Representation of a 2D matrix of integers\n// Matrix objects may be copied.\nstruct Matrix{\n  int width; \n  int height;\n  int data[26]; \n};\n\n// REQUIRES: mat points to a Matrix\n//           0 < width && width <= MAX_MATRIX_WIDTH\n//           0 < height && height <= MAX_MATRIX_HEIGHT\n// MODIFIES: *mat\n// EFFECTS:  Initializes *mat as a Matrix with the given width and height.\nvoid Matrix_init(Matrix* mat, int width, int height);\n\n// REQUIRES: mat points to a valid Matrix\n// MODIFIES: os\n// EFFECTS:  First, prints the width and height for the Matrix to os:\n//             WIDTH [space] HEIGHT [newline]\n//           Then prints the rows of the Matrix to os with one row per line.\n//            Each element is followed by a space and each row is followed\n//           by a newline. This means there will be an \"extra\" space at\n//           the end of each line.\nvoid Matrix_print(const Matrix* mat, ostream& os);\n\n// REQUIRES: mat points to an valid Matrix\n// EFFECTS:  Returns the width of the Matrix.\nint Matrix_width(const Matrix* mat); \n\n// REQUIRES: mat points to a valid Matrix\n// EFFECTS:  Returns the height of the Matrix.\nint Matrix_height(const Matrix* mat);\n\n// REQUIRES: mat points to a valid Matrix\n//           ptr points to an element in the Matrix\n// EFFECTS:  Returns the row of the element pointed to by ptr.\nint Matrix_row(const Matrix* mat, const int* ptr);\n\n// REQUIRES: mat points to a valid Matrix\n//           ptr point to an element in the Matrix\n// EFFECTS:  Returns the column of the element pointed to by ptr.\nint Matrix_column(const Matrix* mat, const int* ptr);\n\n// REQUIRES: mat points to a valid Matrix\n//           0 <= row && row < Matrix_height(mat)\n//           0 <= column && column < Matrix_width(mat)\n//\n// MODIFIES: (The returned pointer may be used to modify an\n//            element in the Matrix.)\n// EFFECTS:  Returns a pointer to the element in the Matrix\n//           at the given row and column.\nint* Matrix_at(Matrix* mat, int row, int column);\n\n// REQUIRES: mat points to a valid Matrix\n//           0 <= row && row < Matrix_height(mat)\n//           0 <= column && column < Matrix_width(mat)\n//\n// EFFECTS:  Returns a pointer-to-const to the element in\n//           the Matrix at the given row and column.\nconst int* Matrix_at(const Matrix* mat, int row, int column);\n\n// REQUIRES: mat points to a valid Matrix\n// MODIFIES: *mat\n// EFFECTS:  Sets each element of the Matrix to the given value.\nvoid Matrix_fill(Matrix* mat, int value);\n\n// REQUIRES: mat points to a valid Matrix\n// MODIFIES: *mat\n// EFFECTS:  Sets each element on the border of the Matrix to\n//           the given value. These are all elements in the first/last\n//           row or the first/last column.\nvoid Matrix_fill_border(Matrix* mat, int value); \n\n// REQUIRES: mat points to a valid Matrix\n// EFFECTS:  Returns the value of the maximum element in the Matrix\nint Matrix_max(const Matrix* mat);\n\n// REQUIRES: mat points to a valid Matrix\n//           0 <= row && row < Matrix_height(mat)\n//           0 <= column_start && column_end <= Matrix_width(mat)\n//           column_start < column_end\n// EFFECTS:  Returns the column of the element with the minimal value\n//           in a particular region. The region is defined as elements\n//           in the given row and between column_start (inclusive) and\n//           column_end (exclusive).\n//           If multiple elements are minimal, returns the column of\n//           the leftmost one.\nint Matrix_column_of_min_value_in_row(const Matrix* mat, int row,\n                                      int column_start, int column_end);\n\n// REQUIRES: mat points to a valid Matrix\n//           0 <= row && row < Matrix_height(mat)\n//           0 <= column_start && column_end <= Matrix_width(mat)\n//           column_start < column_end\n// EFFECTS:  Returns the minimal value in a particular region. The region\n//           is defined as elements in the given row and between\n//           column_start (inclusive) and column_end (exclusive).\nint Matrix_min_value_in_row(const Matrix* mat, int row,\n                            int column_start, int column_end);\n\n/* Image.h\n * Originally written by James Juett at the University of Michigan\n * for project 3 in EECS 280, Winter 2016.\n */\n\n// Representation of an RGB Pixel used for\n// parameter passing and returns by the\n// Image module. This is a POD type.\nstruct Pixel {\n  int r;\n  int g;\n  int b;\n};\n\nconst int MAX_INTENSITY = 255;\n\n// Representation of 2D RGB image.\n// Image objects may be copied.\nstruct Image {\n  int width;\n  int height;\n  Matrix red_channel;\n  Matrix green_channel;\n  Matrix blue_channel;\n};\n\n// REQUIRES: img points to an Image\n//           0 < width <= MAX_MATRIX_WIDTH\n//           0 < height <= MAX_MATRIX_HEIGHT\n// MODIFIES: *img\n// EFFECTS:  Initializes the Image with the given width and height.\nvoid Image_init(Image* img, int width, int height);\n\n// REQUIRES: img points to an Image\n//           is contains an image in PPM format without comments\n//           (any kind of whitespace is ok)\n// MODIFIES: *img\n// EFFECTS:  Initializes the Image by reading in an image in PPM format\n//           from the given input stream.\n// NOTE:     See the project spec for a discussion of PPM format.\nvoid Image_init(Image* img, istream& is); \n \n// REQUIRES: img points to a valid Image\n// MODIFIES: os\n// EFFECTS:  Writes the image to the given output stream in PPM format.\n//           You must use the kind of whitespace specified here.\n//           First, prints out the header for the image like this:\n//             P3 [newline]\n//             WIDTH [space] HEIGHT [newline]\n//             255 [newline]\n//           Next, prints out the rows of the image, each followed by a\n//           newline. Each pixel in a row is printed as three ints\n//           for its red, green, and blue components, in that order. Each\n//           int is followed by a space. This means that there will be an\n//           \"extra\" space at the end of each line. See the project spec\n//           for an example.\nvoid Image_print(const Image* img, ostream& os);\n\n// REQUIRES: img points to a valid Image\n// EFFECTS:  Returns the width of the Image.\nint Image_width(const Image* img);\n\n// REQUIRES: img points to a valid Image\n// EFFECTS:  Returns the height of the Image.\nint Image_height(const Image* img);\n\n// REQUIRES: img points to a valid Image\n//           0 <= row && row < Image_height(img)\n//           0 <= column && column < Image_width(img)\n// EFFECTS:  Returns the pixel in the Image at the given row and column.\nPixel Image_get_pixel(const Image* img, int row, int column);\n\n// REQUIRES: img points to a valid Image\n//           0 <= row && row < Image_height(img)\n//           0 <= column && column < Image_width(img)\n// MODIFIES: *img\n// EFFECTS:  Sets the pixel in the Image at the given row and column\n//           to the given color.\nvoid Image_set_pixel(Image* img, int row, int column, Pixel color);\n\n// REQUIRES: img points to a valid Image\n// MODIFIES: *img\n// EFFECTS:  Sets each pixel in the image to the given color.\nvoid Image_fill(Image* img, Pixel color);\n\n// REQUIRES: mat points to a Matrix\n//           0 < width && width <= MAX_MATRIX_WIDTH\n//           0 < height && height <= MAX_MATRIX_HEIGHT\n// MODIFIES: *mat\n// EFFECTS:  Initializes *mat as a Matrix with the given width and height.\nvoid Matrix_init(Matrix* mat, int width, int height) {\n  mat->width = width; \n  mat->height = height;\n}\n\n// REQUIRES: mat points to a valid Matrix\n// MODIFIES: os\n// EFFECTS:  First, prints the width and height for the Matrix to os:\n//             WIDTH [space] HEIGHT [newline]\n//           Then prints the rows of the Matrix to os with one row per line.\n//           Each element is followed by a space and each row is followed\n//           by a newline. This means there will be an \"extra\" space at\n//           the end of each line.\nvoid Matrix_print(const Matrix* mat, ostream& os) {\n  os << mat->width << \" \" << mat->height << endl;\n  for(int r = 0; r < mat->height; ++r){ \n    for(int c = 0; c < mat->width; ++c){ \n      os << *Matrix_at(mat, r, c) << \" \";\n    }\n    os << endl; \n  }\n}\n\n// REQUIRES: mat points to an valid Matrix\n// EFFECTS:  Returns the width of the Matrix.\nint Matrix_width(const Matrix* mat) {\n  return mat->width;\n}\n\n// REQUIRES: mat points to a valid Matrix\n// EFFECTS:  Returns the height of the Matrix.\nint Matrix_height(const Matrix* mat) {\n  return mat->height;\n}\n\n// REQUIRES: mat points to a valid Matrix\n//           ptr points to an element in the Matrix\n// EFFECTS:  Returns the row of the element pointed to by ptr.\nint Matrix_row(const Matrix* mat, const int* ptr) {\n  return (ptr - mat->data) / mat->width;\n}\n\n// REQUIRES: mat points to a valid Matrix\n//           ptr point to an element in the Matrix\n// EFFECTS:  Returns the column of the element pointed to by ptr.\nint Matrix_column(const Matrix* mat, const int* ptr) {\n  return (ptr - mat->data) % mat->width;\n}\n\n// REQUIRES: mat points to a valid Matrix\n//           0 <= row && row < Matrix_height(mat)\n//           0 <= column && column < Matrix_width(mat)\n//\n// MODIFIES: (The returned pointer may be used to modify an\n//            element in the Matrix.)\n// EFFECTS:  Returns a pointer to the element in the Matrix\n//           at the given row and column.\nint* Matrix_at(Matrix* mat, int row, int column) {\n  assert(row >= 0);\n  assert(row < mat->height);\n  assert(column >= 0);\n  assert(column < mat->width);\n\n  return mat->data + row * mat->width + column;\n}\n\n// REQUIRES: mat points to a valid Matrix\n//           0 <= row && row < Matrix_height(mat)\n//           0 <= column && column < Matrix_width(mat)\n//\n// EFFECTS:  Returns a pointer-to-const to the element in\n//           the Matrix at the given row and column.\nconst int* Matrix_at(const Matrix* mat, int row, int column) {\n  return mat->data + row * mat->width + column;\n}\n\n// REQUIRES: mat points to a valid Matrix\n// MODIFIES: *mat\n// EFFECTS:  Sets each element of the Matrix to the given value.\nvoid Matrix_fill(Matrix* mat, int value) {\n  int *end = mat->data + mat->width * mat->height;\n  for(int *ptr = mat->data; ptr < end; ++ptr){\n    *ptr = value;\n  }\n}\n\n// REQUIRES: mat points to a valid Matrix\n// MODIFIES: *mat\n// EFFECTS:  Sets each element on the border of the Matrix to\n//           the given value. These are all elements in the first/last\n//           row or the first/last column.\nvoid Matrix_fill_border(Matrix* mat, int value) {\n  for(int r = 0; r < mat->height; ++r){\n    *Matrix_at(mat, r, 0) = value;\n    *Matrix_at(mat, r, mat->width - 1) = value;\n  }\n  for(int c = 0; c < mat->width; ++c){\n    *Matrix_at(mat, 0, c) = value;\n    *Matrix_at(mat, mat->height - 1, c) = value;\n  }\n}\n\n// REQUIRES: mat points to a valid Matrix\n// EFFECTS:  Returns the value of the maximum element in the Matrix\nint Matrix_max(const Matrix* mat) {\n  int max = mat->data[0];\n  const int *end = mat->data + mat->width * mat->height;\n  for(const int *ptr = mat->data; ptr < end; ++ptr){\n    if (*ptr > max){\n      max = *ptr;\n    }\n  }\n  return max;\n}\n\n\n\n\n// v DO NOT CHANGE v ------------------------------------------------\n// The implementation of Matrix_normalize is provided for you.\n\n// REQUIRES: mat points to a valid Matrix\n// MODIFIES: *mat\n// EFFECTS:  Linearly scales the values stored in this matrix so\n//           that the new maximum has the given value newMax.\n// NOTE:     In your implementation, you will need to divide each\n//           element by the current maximum in the Matrix and then\n//           multiply by newMax. Make sure to do the operations in\n//           that order to ensure roundoff error is the same in your\n//           implementation as in the correct solution.\nvoid Matrix_normalize(Matrix* mat, int newMax) {\n  int max = Matrix_max(mat);\n  int *ptr = mat->data;\n  for (int r = 0; r < mat->height; ++r) {\n    for (int c = 0; c < mat->width; ++c) {\n      *ptr = int(*ptr) / max * newMax;\n      ++ptr;\n    }\n  }\n}\n// ^ DO NOT CHANGE ^ ------------------------------------------------\n\n\n\n\n// REQUIES: mat points to a valid Matrix\n//          0 <= row && row < Matrix_height(mat)\n//          0 <= column_start && column_end <= Matrix_width(mat)\n//          column_start < column_end\n// EFFECTS: Returns the column of the element with the minimal value\n//          in a particular region. The region is defined as elements\n//          in the given row and between column_start (inclusive) and\n//          column_end (exclusive).\n//          If multiple elements are minimal, returns the column of\n//          the leftmost one.\nint Matrix_column_of_min_value_in_row(const Matrix* mat, int row,\n                                      int column_start, int column_end) {\n  const int *min = Matrix_at(mat, row, column_start);\n  for(int c = column_start; c < column_end; ++c){\n    if (*Matrix_at(mat, row, c) < *min){\n      min = Matrix_at(mat, row, c);\n    }\n  }\n  return Matrix_column(mat, min);\n}\n\n// REQUIES: mat points to a valid Matrix\n//          0 <= row && row < Matrix_height(mat)\n//          0 <= column_start && column_end <= Matrix_width(mat)\n//          column_start < column_end\n// EFFECTS: Returns the minimal value in a particular region. The region\n//          is defined as elements in the given row and between\n//          column_start (inclusive) and column_end (exclusive).\nint Matrix_min_value_in_row(const Matrix* mat, int row,\n                            int column_start, int column_end) {\n  return *Matrix_at(mat, row,\n    Matrix_column_of_min_value_in_row(mat, row, column_start, column_end));\n}\n\n\n// REQUIRES: img points to an Image\n//           0 < width <= MAX_MATRIX_WIDTH\n//           0 < height <= MAX_MATRIX_HEIGHT\n// MODIFIES: *img\n// EFFECTS:  Initializes the Image with the given width and height.\nvoid Image_init(Image* img, int width, int height) {\n  img->width = width;\n  img->height = height;\n\n  // Whoops forgot to init channels\n  /*Matrix_init(&img->red_channel, img->width, img->height);\n  Matrix_init(&img->green_channel, img->width, img->height);\n  Matrix_init(&img->blue_channel, img->width, img->height);*/\n}\n\n// REQUIRES: img points to an Image\n//           is contains an image in PPM format without comments\n//           (any kind of whitespace is ok)\n// MODIFIES: *img\n// EFFECTS:  Initializes the Image by reading in an image in PPM format\n//           from the given input stream.\n// NOTE:     See the project spec for a discussion of PPM format.\nvoid Image_init(Image* img, istream& is) {\n  string junk;\n  is >> junk; // get rid of P3\n  is >> img->width;\n  is >> img->height;\n  is >> junk; // get rid of 255\n\n  Matrix_init(&img->red_channel, img->width, img->height);\n  Matrix_init(&img->green_channel, img->width, img->height);\n  Matrix_init(&img->blue_channel, img->width, img->height);\n\n  for(int r = 0; r < img->height; ++r){\n    for(int c = 0; c < img->width; ++c){\n      is >> *Matrix_at(&img->red_channel, r, c);\n      is >> *Matrix_at(&img->green_channel, r, c);\n      is >> *Matrix_at(&img->blue_channel, r, c);\n    }\n  }\n}\n\n// REQUIRES: img points to a valid Image\n// EFFECTS:  Writes the image to the given output stream in PPM format.\n//           You must use the kind of whitespace specified here.\n//           First, prints out the header for the image like this:\n//             P3 [newline]\n//             WIDTH [space] HEIGHT [newline]\n//             255 [newline]\n//           Next, prints out the rows of the image, each followed by a\n//           newline. Each pixel in a row is printed as three ints\n//           for its red, green, and blue components, in that order. Each\n//           int is followed by a space. This means that there will be an\n//           \"extra\" space at the end of each line. See the project spec\n//           for an example.\nvoid Image_print(const Image* img, ostream& os) {\n  os << \"P3\" << \"\\n\";\n  os << img->width << \" \" << img->height << \"\\n\";\n  os << \"255\" << \"\\n\";\n\n  for(int r = 0; r < img->height; ++r){\n    for(int c = 0; c < img->width; ++c){\n      Pixel p = Image_get_pixel(img, r, c);\n      os << p.r << \" \" << p.g << \" \" << p.b << \" \";\n    }\n    os << \"\\n\";\n  }\n}\n\n// REQUIRES: img points to a valid Image\n// EFFECTS:  Returns the width of the Image.\nint Image_width(const Image* img) {\n  return img->width;\n}\n\n// REQUIRES: img points to a valid Image\n// EFFECTS:  Returns the height of the Image. \nint Image_height(const Image* img) {\n  return img->height;\n}\n\n// REQUIRES: img points to a valid Image\n//           0 <= row && row < Image_height(img)\n//           0 <= column && column < Image_width(img)\n// EFFECTS:  Returns the pixel in the Image at the given row and column.\nPixel Image_get_pixel(const Image* img, int row, int column) {\n  Pixel p;\n  p.r = *Matrix_at(&img->red_channel, row, column);\n  p.g = *Matrix_at(&img->green_channel, row, column);\n  p.b = *Matrix_at(&img->blue_channel, row, column);\n  return p;\n}\n\n// REQUIRES: img points to a valid Image\n//           0 <= row && row < Image_height(img)\n//           0 <= column && column < Image_width(img)\n// MODIFIES: *img\n// EFFECTS:  Sets the pixel in the Image at the given row and column\n//           to the given color.\nvoid Image_set_pixel(Image* img, int row, int column, Pixel color) {\n  *Matrix_at(&img->red_channel, row, column) = color.r;\n  *Matrix_at(&img->green_channel, row, column) = color.g;\n  *Matrix_at(&img->blue_channel, row, column) = color.b;\n}\n\n// REQUIRES: img points to a valid Image\n// MODIFIES: *img\n// EFFECTS:  Sets each pixel in the image to the given color.\nvoid Image_fill(Image* img, Pixel color) {\n  for(int r = 0; r < img->height; ++r){\n    for(int c = 0; c < img->width; ++c){\n      Image_set_pixel(img, r, c, color);\n    }\n  }\n}\n\nint main(){\n  Image img;\n  Image_init(&img, 2, 3);\n  \n  \n}',0,'2017-02-09 22:23:59');
/*!40000 ALTER TABLE `user_code` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_info`
--

DROP TABLE IF EXISTS `user_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_info` (
  `uniqname` varchar(100) NOT NULL,
  `lastProject` varchar(50) NOT NULL,
  `lastFile` varchar(30) NOT NULL,
  `lab2group` int(11) NOT NULL,
  PRIMARY KEY (`uniqname`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_info`
--

LOCK TABLES `user_info` WRITE;
/*!40000 ALTER TABLE `user_info` DISABLE KEYS */;
INSERT INTO `user_info` VALUES ('jjuett@umich.edu','ImageProcessing','p2',1),('james.juett@gmail.com','','program',1);
/*!40000 ALTER TABLE `user_info` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_project_files`
--

DROP TABLE IF EXISTS `user_project_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_project_files` (
  `email` varchar(100) NOT NULL,
  `project` varchar(50) NOT NULL,
  `name` varchar(50) NOT NULL,
  `code` text NOT NULL,
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`email`,`project`,`name`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_project_files`
--

LOCK TABLES `user_project_files` WRITE;
/*!40000 ALTER TABLE `user_project_files` DISABLE KEYS */;
INSERT INTO `user_project_files` VALUES ('jjuett@umich.edu','ImageProcessing','Image.cpp','#include <cassert>\n#include \"Image.h\"\n\n// REQUIRES: img points to an Image\n//           0 < width <= MAX_MATRIX_WIDTH\n//           0 < height <= MAX_MATRIX_HEIGHT\n// MODIFIES: *img\n// EFFECTS:  Initializes the Image with the given width and height.\nvoid Image_init(Image* img, int width, int height) {\n  img->width = width;\n  img->height = height;\n\n  img->red_channel.data[0] = 0; \n  \n  // Whoops forgot to init channels\n  /*Matrix_init(&img->red_channel, img->width, img->height);\n  Matrix_init(&img->green_channel, img->width, img->height);\n  Matrix_init(&img->blue_channel, img->width, img->height);*/\n}\n\n// REQUIRES: img points to an Image\n//           is contains an image in PPM format without comments\n//           (any kind of whitespace is ok)\n// MODIFIES: *img\n// EFFECTS:  Initializes the Image by reading in an image in PPM format\n//           from the given input stream.\n// NOTE:     See the project spec for a discussion of PPM format.\nvoid Image_init(Image* img, istream& is) {\n  string junk = \"\";\n  is >> junk; // get rid of P3\n  is >> img->width;\n  is >> img->height;\n  is >> junk; // get rid of 255\n\n  /*Matrix_init(&img->red_channel, img->width, img->height);\n  Matrix_init(&img->green_channel, img->width, img->height);\n  Matrix_init(&img->blue_channel, img->width, img->height);*/\n\n\n  for(int r = 0; r < img->height; ++r){\n    for(int c = 0; c < img->width; ++c){\n      is >> *Matrix_at(&img->red_channel, r, c);\n      is >> *Matrix_at(&img->green_channel, r, c);\n      is >> *Matrix_at(&img->blue_channel, r, c);\n    }\n  }\n}\n\n// REQUIRES: img points to a valid Image\n// EFFECTS:  Writes the image to the given output stream in PPM format.\n//           You must use the kind of whitespace specified here.\n//           First, prints out the header for the image like this:\n//             P3 [newline]\n//             WIDTH [space] HEIGHT [newline]\n//             255 [newline]\n//           Next, prints out the rows of the image, each followed by a\n//           newline. Each pixel in a row is printed as three ints\n//           for its red, green, and blue components, in that order. Each\n//           int is followed by a space. This means that there will be an\n//           \"extra\" space at the end of each line. See the project spec\n//           for an example.\n/*void Image_print(const Image* img, ostream& os) {\n  os << \"P3\" << \"\\n\";\n  os << img->width << \" \" << img->height << \"\\n\";\n  os << \"255\" << \"\\n\";\n\n  for(int r = 0; r < img->height; ++r){\n    for(int c = 0; c < img->width; ++c){\n      Pixel p = Image_get_pixel(img, r, c);\n      os << p.r << \" \" << p.g << \" \" << p.b << \" \";\n    }\n    os << \"\\n\";\n  }\n}*/\n\n// REQUIRES: img points to a valid Image\n// EFFECTS:  Returns the width of the Image.\nint Image_width(const Image* img) {\n  return img->width;\n}\n\n// REQUIRES: img points to a valid Image\n// EFFECTS:  Returns the height of the Image.\nint Image_height(const Image* img) {\n  return img->height;\n}\n\n// REQUIRES: img points to a valid Image\n//           0 <= row && row < Image_height(img)\n//           0 <= column && column < Image_width(img)\n// EFFECTS:  Returns the pixel in the Image at the given row and column.\nPixel Image_get_pixel(const Image* img, int row, int column) {\n  Pixel p;\n  p.r = *Matrix_at(&img->red_channel, row, column);\n  p.g = *Matrix_at(&img->green_channel, row, column);\n  p.b = *Matrix_at(&img->blue_channel, row, column);\n  return p;\n}\n\n\n// Helper function in Image that doesn\'t break the interface shouldn\'t be counted\nMatrix notNaughtyFunction(Image* img) {\n        return img->red_channel;\n}\n\nMatrix naughtyFunction(Image* img) {\n  int x = img->red_channel.data[0];\n        return img->red_channel; // whoops breaking interface\n}\n\n\n// REQUIRES: img points to a valid Image\n//           0 <= row && row < Image_height(img)\n//           0 <= column && column < Image_width(img)\n// MODIFIES: *img\n// EFFECTS:  Sets the pixel in the Image at the given row and column\n//           to the given color.\nvoid Image_set_pixel(Image* img, int row, int column, Pixel color) {\n\n  //Matrix test = naughtyFunction(img);\n  *Matrix_at(&img->red_channel, row, column) = color.r;\n  *Matrix_at(&img->green_channel, row, column) = color.g;\n  *Matrix_at(&img->blue_channel, row, column) = color.b;\n}\n\n// REQUIRES: img points to a valid Image\n// MODIFIES: *img\n// EFFECTS:  Sets each pixel in the image to the given color.\nvoid Image_fill(Image* img, Pixel color) {\n  for(int r = 0; r < img->height; ++r){\n    for(int c = 0; c < img->width; ++c){\n      Image_set_pixel(img, r, c, color);\n    }\n  }\n  \n  //int green1 = *(i_ptr->green_channel.data);\n}','2017-04-21 19:48:09'),('jjuett@umich.edu','ImageProcessing','Image.h','#ifndef IMAGE_H\n#define IMAGE_H\n\n/* Image.h\n * Originally written by James Juett at the University of Michigan\n * for project 3 in EECS 280, Winter 2016.\n */\n\n#include <iostream>\n#include \"Matrix.h\"\n\n// Representation of an RGB Pixel used for\n// parameter passing and returns by the\n// Image module. This is a POD type.\nstruct Pixel {\n  int r;\n  int g;\n  int b;\n};\n\nconst int MAX_INTENSITY = 255;\n\n// Representation of 2D RGB image.\n// Image objects may be copied.\nstruct Image {\n  int width;\n  int height;\n  Matrix red_channel;\n  Matrix green_channel;\n  Matrix blue_channel;\n};\n\n// REQUIRES: img points to an Image\n//           0 < width <= MAX_MATRIX_WIDTH\n//           0 < height <= MAX_MATRIX_HEIGHT\n// MODIFIES: *img\n// EFFECTS:  Initializes the Image with the given width and height.\nvoid Image_init(Image* img, int width, int height);\n\n// REQUIRES: img points to an Image\n//           is contains an image in PPM format without comments\n//           (any kind of whitespace is ok)\n// MODIFIES: *img\n// EFFECTS:  Initializes the Image by reading in an image in PPM format\n//           from the given input stream.\n// NOTE:     See the project spec for a discussion of PPM format.\nvoid Image_init(Image* img, istream& is);\n\n// REQUIRES: img points to a valid Image\n// MODIFIES: os\n// EFFECTS:  Writes the image to the given output stream in PPM format.\n//           You must use the kind of whitespace specified here.\n//           First, prints out the header for the image like this:\n//             P3 [newline]\n//             WIDTH [space] HEIGHT [newline]\n//             255 [newline]\n//           Next, prints out the rows of the image, each followed by a\n//           newline. Each pixel in a row is printed as three ints\n//           for its red, green, and blue components, in that order. Each\n//           int is followed by a space. This means that there will be an\n//           \"extra\" space at the end of each line. See the project spec\n//           for an example.\nvoid Image_print(const Image* img, ostream& os);\n\n// REQUIRES: img points to a valid Image\n// EFFECTS:  Returns the width of the Image.\nint Image_width(const Image* img);\n\n// REQUIRES: img points to a valid Image\n// EFFECTS:  Returns the height of the Image.\nint Image_height(const Image* img);\n\n// REQUIRES: img points to a valid Image\n//           0 <= row && row < Image_height(img)\n//           0 <= column && column < Image_width(img)\n// EFFECTS:  Returns the pixel in the Image at the given row and column.\nPixel Image_get_pixel(const Image* img, int row, int column);\n\n// REQUIRES: img points to a valid Image\n//           0 <= row && row < Image_height(img)\n//           0 <= column && column < Image_width(img)\n// MODIFIES: *img\n// EFFECTS:  Sets the pixel in the Image at the given row and column\n//           to the given color.\nvoid Image_set_pixel(Image* img, int row, int column, Pixel color);\n\n// REQUIRES: img points to a valid Image\n// MODIFIES: *img\n// EFFECTS:  Sets each pixel in the image to the given color.\nvoid Image_fill(Image* img, Pixel color);\n\n#endif // IMAGE_H','2017-04-11 22:03:21'),('jjuett@umich.edu','ImageProcessing','Image_public_test.cpp','#include \"Image.h\"\n#include \"Image_test_helpers.h\"\n#include <iostream>\n#include <sstream>\n#include <cassert>\n\nusing namespace std;\n\n\n// This is the public Image test for which the autograder gives feedback.\n// It only tests VERY FEW of the expected behaviors of the Image module.\n// It will only really tell you if your code compiles and you remembered to\n// write the functions. It is not to be trusted. It tells the truth, but not\n// the whole truth. It might put you in a blender. You get the point.\n// You must write your own comprehensive unit tests in Image_tests.cpp!\n\n\nint main() {\n  Pixel red; red.r = 255; red.g = 0; red.b = 0;\n  Pixel green; green.r = 0; green.g = 255; green.b = 0;\n  Image img;\n  Image_init(&img, 3, 4);\n\n  assert(Image_width(&img) == 3);\n  assert(Image_height(&img) == 4);\n\n  Image_fill(&img, red);\n  assert(Pixel_equal(Image_get_pixel(&img, 2, 2), red));\n\n  Image_set_pixel(&img, 0, 0, green);\n  assert(Pixel_equal(Image_get_pixel(&img, 0, 0), green));\n\n  /*\n  // A very poorly behaved input PPM.\n  string input = \"P3 2 2\\t255 255 0 0\\n0\\n255 0 \\n0 0 255 255 255 255 \\n\";\n  istringstream ss_input(input);\n  Image_init(&img, ss_input);\n\n  // Should be well behaved when you print it though!\n  string output_correct = \"P3\\n2 2\\n255\\n255 0 0 0 255 0 \\n0 0 255 255 255 255 \\n\";\n  ostringstream ss_output;\n  Image_print(&img, ss_output);\n  string actual = ss_output.str();\n  cout << actual << endl;\n  assert(actual == output_correct);\n\n  Matrix mat;\n  Matrix_init(&mat, 6, 1);\n  for(int c = 0; c < 6; ++c){\n    *Matrix_at(&mat, 0, c) = c;\n  }\n\n  cout << \"Image_public_test PASS\" << endl;*/\n}','2017-04-21 15:12:34'),('jjuett@umich.edu','ImageProcessing','Image_test_helpers.cpp','/* Image_test_helpers.cpp\n * Originally written by James Juett at the University of Michigan\n * for project 3 in EECS 280, Winter 2016.\n */\n\n#include \"Image_test_helpers.h\"\n\nbool Pixel_equal(Pixel p1, Pixel p2){\n  return p1.r == p2.r && p1.g == p2.g && p1.b == p2.b;\n}\n\nbool Image_equal(const Image* img1, const Image* img2){\n  if (Image_width(img1) != Image_width(img2)){ return false; }\n  if (Image_height(img1) != Image_height(img2)){ return false; }\n\n  for(int r = 0; r < Image_height(img1); ++r){\n    for(int c = 0; c < Image_width(img1); ++c){\n      if (!Pixel_equal(Image_get_pixel(img1, r, c), Image_get_pixel(img2, r, c))){\n        return false;\n      }\n    }\n  }\n  \n  return true;\n}','2017-04-11 21:25:45'),('jjuett@umich.edu','ImageProcessing','Image_test_helpers.h','#ifndef IMAGE_TEST_HELPERS_H\n#define IMAGE_TEST_HELPERS_H\n\n/* Image_test_helpers.h\n * Originally written by James Juett at the University of Michigan\n * for project 3 in EECS 280, Winter 2016.\n */\n\n#include \"Image.h\"\n\n// EFFECTS: Returns true if p1 and p2 are equal. Returns false otherwise.\nbool Pixel_equal(Pixel p1, Pixel p2);\n\n// REQUIRES: img1 points to a valid Image\n//           img2 points to a valid Image\n// EFFECTS:  Returns true if img1 and img2 are the same size and\n//           contain exactly the same pixels. Returns false otherwise.\nbool Image_equal(const Image* img1, const Image* img2);\n\n#endif // IMAGE_TEST_HELPERS_H','2017-04-11 21:25:20'),('jjuett@umich.edu','ImageProcessing','Matrix.cpp','#include <cassert>\n#include \"Matrix.h\"\n\n// REQUIRES: mat points to a Matrix\n//           0 < width && width <= MAX_MATRIX_WIDTH\n//           0 < height && height <= MAX_MATRIX_HEIGHT\n// MODIFIES: *mat\n// EFFECTS:  Initializes *mat as a Matrix with the given width and height.\nvoid Matrix_init(Matrix* mat, int width, int height) {\n  mat->width = width;\n  mat->height = height;\n}\n\n// REQUIRES: mat points to a valid Matrix\n// MODIFIES: os\n// EFFECTS:  First, prints the width and height for the Matrix to os:\n//             WIDTH [space] HEIGHT [newline]\n//           Then prints the rows of the Matrix to os with one row per line.\n//           Each element is followed by a space and each row is followed\n//           by a newline. This means there will be an \"extra\" space at\n//           the end of each line.\n/*void Matrix_print(const Matrix* mat, ostream& os) {\n  os << mat->width << \" \" << mat->height << endl;\n  for(int r = 0; r < mat->height; ++r){\n    for(int c = 0; c < mat->width; ++c){\n      os << *Matrix_at(mat, r, c) << \" \";\n    }\n    os << endl;\n  }\n}\n*/\n// REQUIRES: mat points to an valid Matrix\n// EFFECTS:  Returns the width of the Matrix.\nint Matrix_width(const Matrix* mat) {\n  return mat->width;\n}\n\n// REQUIRES: mat points to a valid Matrix\n// EFFECTS:  Returns the height of the Matrix.\nint Matrix_height(const Matrix* mat) {\n  return mat->height;\n}\n\n// REQUIRES: mat points to a valid Matrix\n//           ptr points to an element in the Matrix\n// EFFECTS:  Returns the row of the element pointed to by ptr.\nint Matrix_row(const Matrix* mat, const int* ptr) {\n  return (ptr - mat->data) / mat->width;\n}\n\n// REQUIRES: mat points to a valid Matrix\n//           ptr point to an element in the Matrix\n// EFFECTS:  Returns the column of the element pointed to by ptr.\nint Matrix_column(const Matrix* mat, const int* ptr) {\n  return (ptr - mat->data) % mat->width;\n}\n\n// REQUIRES: mat points to a valid Matrix\n//           0 <= row && row < Matrix_height(mat)\n//           0 <= column && column < Matrix_width(mat)\n//\n// MODIFIES: (The returned pointer may be used to modify an\n//            element in the Matrix.)\n// EFFECTS:  Returns a pointer to the element in the Matrix\n//           at the given row and column.\nint* Matrix_at(Matrix* mat, int row, int column) {\n  assert(row >= 0);\n  assert(row < mat->height);\n  assert(column >= 0);\n  assert(column < mat->width);\n\n  return mat->data + row * mat->width + column;\n}\n\n// REQUIRES: mat points to a valid Matrix\n//           0 <= row && row < Matrix_height(mat)\n//           0 <= column && column < Matrix_width(mat)\n//\n// EFFECTS:  Returns a pointer-to-const to the element in\n//           the Matrix at the given row and column.\nconst int* Matrix_at(const Matrix* mat, int row, int column) {\n  return mat->data + row * mat->width + column;\n}\n\n// REQUIRES: mat points to a valid Matrix\n// MODIFIES: *mat\n// EFFECTS:  Sets each element of the Matrix to the given value.\nvoid Matrix_fill(Matrix* mat, int value) {\n  int *end = mat->data + mat->width * mat->height;\n  for(int *ptr = mat->data; ptr < end; ++ptr){\n    *ptr = value;\n  }\n}\n\n// REQUIRES: mat points to a valid Matrix\n// MODIFIES: *mat\n// EFFECTS:  Sets each element on the border of the Matrix to\n//           the given value. These are all elements in the first/last\n//           row or the first/last column.\nvoid Matrix_fill_border(Matrix* mat, int value) {\n  for(int r = 0; r < mat->height; ++r){\n    *Matrix_at(mat, r, 0) = value;\n    *Matrix_at(mat, r, mat->width - 1) = value;\n  }\n  for(int c = 0; c < mat->width; ++c){\n    *Matrix_at(mat, 0, c) = value;\n    *Matrix_at(mat, mat->height - 1, c) = value;\n  }\n}\n\n// REQUIRES: mat points to a valid Matrix\n// EFFECTS:  Returns the value of the maximum element in the Matrix\nint Matrix_max(const Matrix* mat) {\n  int max = mat->data[0];\n  const int *end = mat->data + mat->width * mat->height;\n  for(const int *ptr = mat->data; ptr < end; ++ptr){\n    if (*ptr > max){\n      max = *ptr;\n    }\n  }\n  return max;\n}\n\n\n// REQUIES: mat points to a valid Matrix\n//          0 <= row && row < Matrix_height(mat)\n//          0 <= column_start && column_end <= Matrix_width(mat)\n//          column_start < column_end\n// EFFECTS: Returns the column of the element with the minimal value\n//          in a particular region. The region is defined as elements\n//          in the given row and between column_start (inclusive) and\n//          column_end (exclusive).\n//          If multiple elements are minimal, returns the column of\n//          the leftmost one.\nint Matrix_column_of_min_value_in_row(const Matrix* mat, int row,\n                                      int column_start, int column_end) {\n  const int *min = Matrix_at(mat, row, column_start);\n  for(int c = column_start; c < column_end; ++c){\n    if (*Matrix_at(mat, row, c) < *min){\n      min = Matrix_at(mat, row, c);\n    }\n  }\n  return Matrix_column(mat, min);\n}\n\n// REQUIES: mat points to a valid Matrix\n//          0 <= row && row < Matrix_height(mat)\n//          0 <= column_start && column_end <= Matrix_width(mat)\n//          column_start < column_end\n// EFFECTS: Returns the minimal value in a particular region. The region\n//          is defined as elements in the given row and between\n//          column_start (inclusive) and column_end (exclusive).\nint Matrix_min_value_in_row(const Matrix* mat, int row,\n                            int column_start, int column_end) {\n  return *Matrix_at(mat, row,\n    Matrix_column_of_min_value_in_row(mat, row, column_start, column_end));\n}','2017-04-11 21:52:54'),('jjuett@umich.edu','ImageProcessing','Matrix.h','#ifndef MATRIX_H\n#define MATRIX_H\n\n/* Matrix.h\n * Originally written by James Juett at the University of Michigan\n * for project 3 in EECS 280, Winter 2016.\n *\n * The Matrix module is based on an earlier project by\n * Andrew DeOrio.\n */\n\n#include <iostream>\n\nconst int MAX_MATRIX_WIDTH = 500;\nconst int MAX_MATRIX_HEIGHT = 500;\n\n// Representation of a 2D matrix of integers\n// Matrix objects may be copied.\nstruct Matrix{\n  int width;\n  int height;\n  int data[25];\n};\n\n// REQUIRES: mat points to a Matrix\n//           0 < width && width <= MAX_MATRIX_WIDTH\n//           0 < height && height <= MAX_MATRIX_HEIGHT\n// MODIFIES: *mat\n// EFFECTS:  Initializes *mat as a Matrix with the given width and height.\nvoid Matrix_init(Matrix* mat, int width, int height);\n\n// REQUIRES: mat points to a valid Matrix\n// MODIFIES: os\n// EFFECTS:  First, prints the width and height for the Matrix to os:\n//             WIDTH [space] HEIGHT [newline]\n//           Then prints the rows of the Matrix to os with one row per line.\n//           Each element is followed by a space and each row is followed\n//           by a newline. This means there will be an \"extra\" space at\n//           the end of each line.\n//void Matrix_print(const Matrix* mat, ostream& os);\n\n// REQUIRES: mat points to an valid Matrix\n// EFFECTS:  Returns the width of the Matrix.\nint Matrix_width(const Matrix* mat);\n\n// REQUIRES: mat points to a valid Matrix\n// EFFECTS:  Returns the height of the Matrix.\nint Matrix_height(const Matrix* mat);\n\n// REQUIRES: mat points to a valid Matrix\n//           ptr points to an element in the Matrix\n// EFFECTS:  Returns the row of the element pointed to by ptr.\nint Matrix_row(const Matrix* mat, const int* ptr);\n\n// REQUIRES: mat points to a valid Matrix\n//           ptr point to an element in the Matrix\n// EFFECTS:  Returns the column of the element pointed to by ptr.\nint Matrix_column(const Matrix* mat, const int* ptr);\n\n// REQUIRES: mat points to a valid Matrix\n//           0 <= row && row < Matrix_height(mat)\n//           0 <= column && column < Matrix_width(mat)\n//\n// MODIFIES: (The returned pointer may be used to modify an\n//            element in the Matrix.)\n// EFFECTS:  Returns a pointer to the element in the Matrix\n//           at the given row and column.\nint* Matrix_at(Matrix* mat, int row, int column);\n\n// REQUIRES: mat points to a valid Matrix\n//           0 <= row && row < Matrix_height(mat)\n//           0 <= column && column < Matrix_width(mat)\n//\n// EFFECTS:  Returns a pointer-to-const to the element in\n//           the Matrix at the given row and column.\nconst int* Matrix_at(const Matrix* mat, int row, int column);\n\n// REQUIRES: mat points to a valid Matrix\n// MODIFIES: *mat\n// EFFECTS:  Sets each element of the Matrix to the given value.\nvoid Matrix_fill(Matrix* mat, int value);\n\n// REQUIRES: mat points to a valid Matrix\n// MODIFIES: *mat\n// EFFECTS:  Sets each element on the border of the Matrix to\n//           the given value. These are all elements in the first/last\n//           row or the first/last column.\nvoid Matrix_fill_border(Matrix* mat, int value);\n\n// REQUIRES: mat points to a valid Matrix\n// EFFECTS:  Returns the value of the maximum element in the Matrix\nint Matrix_max(const Matrix* mat);\n\n// REQUIES: mat points to a valid Matrix\n//          0 <= row && row < Matrix_height(mat)\n//          0 <= column_start && column_end <= Matrix_width(mat)\n//          column_start < column_end\n// EFFECTS: Returns the column of the element with the minimal value\n//          in a particular region. The region is defined as elements\n//          in the given row and between column_start (inclusive) and\n//          column_end (exclusive).\n//          If multiple elements are minimal, returns the column of\n//          the leftmost one.\nint Matrix_column_of_min_value_in_row(const Matrix* mat, int row,\n                                      int column_start, int column_end);\n\n// REQUIRES: mat points to a valid Matrix\n//          0 <= row && row < Matrix_height(mat)\n//          0 <= column_start && column_end <= Matrix_width(mat)\n//          column_start < column_end\n// EFFECTS: Returns the minimal value in a particular region. The region\n//          is defined as elements in the given row and between\n//          column_start (inclusive) and column_end (exclusive).\nint Matrix_min_value_in_row(const Matrix* mat, int row,\n                            int column_start, int column_end);\n\n#endif // MATRIX_H','2017-04-11 22:04:18'),('jjuett@umich.edu','ImageProcessing','Matrix_public_test.cpp','#include \"Matrix.h\"\n#include \"Matrix_test_helpers.h\"\n#include <iostream>\n#include <sstream>\n#include <cassert>\n\nusing namespace std;\n\n\n// This is the public Matrix test for which the autograder gives feedback.\n// It only tests VERY FEW of the expected behaviors of the Matrix module.\n// It will only really tell you if your code compiles and you remembered to\n// write the functions. It is not to be trusted. It tells the truth, but not\n// the whole truth. It might put you in a blender. You get the point.\n// You must write your own comprehensive unit tests in Matrix_tests.cpp!\n\n\nint main() {\n  Matrix mat;\n  Matrix_init(&mat, 5, 5);\n\n  assert(Matrix_width(&mat) == 5);\n  assert(Matrix_height(&mat) == 5);\n\n  Matrix_fill(&mat, 0);\n\n  int *ptr = Matrix_at(&mat, 2, 3);\n  assert(Matrix_row(&mat, ptr) == 2);\n  assert(Matrix_column(&mat, ptr) == 3);\n  assert(*ptr == 0);\n  *ptr = 42;\n\n  const int *cptr = Matrix_at(&mat, 2, 3);\n  assert(*cptr == 42);\n\n  Matrix_fill_border(&mat, 2);\n  assert(*Matrix_at(&mat, 0, 0) == 2);\n\n  assert(Matrix_max(&mat) == 42);\n\n  /*Matrix_init(&mat, 1, 1);\n  *Matrix_at(&mat, 0, 0) = 42;\n  ostringstream expected;\n  expected << \"1 1\\n\"\n           << \"42 \\n\";\n  ostringstream actual;\n  Matrix_print(&mat, actual);\n  assert(expected.str() == actual.str());*/\n\n  cout << \"Matrix_public_test PASS\" << endl;\n}','2017-04-11 22:51:57'),('jjuett@umich.edu','ImageProcessing','Matrix_test_helpers.cpp','/* Matrix_test_helpers.cpp\n * Originally written by James Juett at the University of Michigan\n * for project 3 in EECS 280, Winter 2016.\n */\n\n#include \"Matrix_test_helpers.h\"\n\nbool Matrix_equal(const Matrix* mat1, const Matrix* mat2){\n  if (Matrix_width(mat1) != Matrix_width(mat2)){ return false; }\n  if (Matrix_height(mat1) != Matrix_height(mat2)){ return false; }\n\n  for(int r = 0; r < Matrix_height(mat1); ++r){\n    for(int c = 0; c < Matrix_width(mat1); ++c){\n      if (*Matrix_at(mat1, r, c) != *Matrix_at(mat2, r, c)){ return false; }\n    }\n  }\n  \n  return true;\n}\n\nbool array_equal(const int arr1[], const int arr2[], int n){\n  for(int i = 0; i < n; ++i){\n    if(arr1[i] != arr2[i]){ return false; }\n  }\n\n  return true;\n}\n','2017-04-11 21:25:50'),('jjuett@umich.edu','ImageProcessing','Matrix_test_helpers.h','#ifndef MATRIX_TEST_HELPERS_H\n#define MATRIX_TEST_HELPERS_H\n\n/* Matrix_test_helpers.h\n * Originally written by James Juett at the University of Michigan\n * for project 3 in EECS 280, Winter 2016.\n */\n\n#include \"Matrix.h\"\n\n// REQUIRES: mat1 points to a valid Matrix\n//           mat2 points to a valid Matrix\n// EFFECTS:  Returns true if mat1 and mat2 are the same size and\n//           contain exactly the same elements. Returns false otherwise.\nbool Matrix_equal(const Matrix* mat1, const Matrix* mat2);\n\n// REQUIRES: arr1 and arr2 point to arrays of length n\n// EFFECTS:  Returns true if the arrays pointed to by arr1 and arr2\n//           contain exactly the same elements. Returns false otherwise.\nbool array_equal(const int arr1[], const int arr2[], int n);\n\n#endif // MATRIX_TEST_HELPERS_H','2017-04-11 21:25:45'),('jjuett@umich.edu','ImageProcessing','processing.cpp','#include <cassert>\n#include \"processing.h\"\n\nusing namespace std;\n\n// v DO NOT CHANGE v ------------------------------------------------\n// The implementation of rotate_left is provided for you.\n// REQUIRES: img points to a valid Image\n// MODIFIES: *img\n// EFFECTS:  The image is rotated 90 degrees to the left (counterclockwise).\nvoid rotate_left(Image* img) {\n\n  // for convenience\n  int width = Image_width(img);\n  int height = Image_height(img);\n\n  // auxiliary image to temporarily store rotated image\n  Image aux;\n  Image_init(&aux, height, width); // width and height switched\n  \n  // iterate through pixels and place each where it goes in temp\n  for (int r = 0; r < height; ++r) {\n    for (int c = 0; c < width; ++c) {\n      Image_set_pixel(&aux, width - 1 - c, r, Image_get_pixel(img, r, c));\n    }\n  }\n	aux.red_channel;\n  // Copy data back into original\n  *img = aux;\n}\n// ^ DO NOT CHANGE ^ ------------------------------------------------\n\n// v DO NOT CHANGE v ------------------------------------------------\n// The implementation of rotate_right is provided for you.\n// REQUIRES: img points to a valid Image.\n// MODIFIES: *img\n// EFFECTS:  The image is rotated 90 degrees to the right (clockwise).\nvoid rotate_right(Image* img){\n\n  // for convenience\n  int width = Image_width(img);\n  int height = Image_height(img);\n\n  // auxiliary image to temporarily store rotated image\n  Image aux;\n  Image_init(&aux, height, width); // width and height switched\n  \n  // iterate through pixels and place each where it goes in temp\n  for (int r = 0; r < height; ++r) {\n    for (int c = 0; c < width; ++c) {\n      Image_set_pixel(&aux, c, height - 1 - r, Image_get_pixel(img, r, c));\n    }\n  }\n\n  // Copy data back into original\n  *img = aux;\n}\n// ^ DO NOT CHANGE ^ ------------------------------------------------\n\n\n// v DO NOT CHANGE v ------------------------------------------------\n// The implementation of diff2 is provided for you.\nstatic int squared_difference(Pixel p1, Pixel p2) {\n  int dr = p2.r - p1.r;\n  int dg = p2.g - p1.g;\n  int db = p2.b - p1.b;\n  // Divide by 100 is to avoid possible overflows\n  // later on in the algorithm.\n  return (dr*dr + dg*dg + db*db) / 100;\n}\n// ^ DO NOT CHANGE ^ ------------------------------------------------\n\n\n// ------------------------------------------------------------------\n// You may change code below this line!\n\n\n\n// REQUIRES: img points to a valid Image.\n//           energy points to a Matrix.\n// MODIFIES: *energy\n// EFFECTS:  energy serves as an \"output parameter\".\n//           The Matrix pointed to by energy is initialized to be the same\n//           size as the given Image, and then the energy matrix for that\n//           image is computed and written into it.\n//           See the project spec for details on computing the energy matrix.\nvoid compute_energy_matrix(const Image* img, Matrix* energy) {\n  Matrix_init(energy, Image_width(img), Image_height(img));\n  Matrix_fill(energy, 0);\n  \n  for(int r = 1; r < Image_height(img)-1; ++r){\n    for(int c = 1; c < Image_width(img)-1; ++c){\n      Pixel N = Image_get_pixel(img, r-1, c);\n      Pixel S = Image_get_pixel(img, r+1, c);\n      Pixel W = Image_get_pixel(img, r, c-1);\n      Pixel E = Image_get_pixel(img, r, c+1);\n      *Matrix_at(energy, r, c) = squared_difference(N,S) + squared_difference(E, W);\n    }\n  }\n\n  Matrix_fill_border(energy, Matrix_max(energy));\n}\n\n\nstatic int min(int x, int y){\n  return x < y ? x : y;\n}\n\nstatic int max(int x, int y){\n  return x > y ? x : y;\n}\n\n// REQUIRES: energy points to a valid Matrix.\n//           cost points to a Matrix.\n//           energy and cost aren\'t pointing to the same Matrix\n// MODIFIES: *cost\n// EFFECTS:  cost serves as an \"output parameter\".\n//           The Matrix pointed to by cost is initialized to be the same\n//           size as the given energy Matrix, and then the cost matrix is\n//           computed and written into it.\n//           See the project spec for details on computing the cost matrix.\nvoid compute_vertical_cost_matrix(const Matrix* energy, Matrix *cost) {\n  Matrix_init(cost, Matrix_width(energy), Matrix_height(energy));\n  \n  for(int c = 0; c < Matrix_width(cost); ++c){\n    *Matrix_at(cost, 0, c) = *Matrix_at(energy, 0, c);\n  }\n\n  for(int r = 1; r < Matrix_height(cost); ++r){\n    for(int c = 0; c < Matrix_width(cost); ++c){\n      *Matrix_at(cost, r, c) = *Matrix_at(energy, r, c) + \n        Matrix_min_value_in_row(cost, r-1, max(0, c-1),\n                                min(c+2, Matrix_width(cost)));\n    }\n  }\n}\n\n\n// REQUIRES: cost points to a valid Matrix\n//           seam points to an array\n//           the size of seam is >= Matrix_height(cost)\n// MODIFIES: seam[0]...seam[Matrix_height(cost)-1]\n// EFFECTS:  seam serves as an \"output parameter\".\n//           The vertical seam with the minimal cost according to the given\n//           cost matrix is found and the seam array is filled with the column\n//           numbers for each pixel along the seam, starting with the lowest\n//           numbered row (top of image) and progressing to the highest\n//           (bottom of image). While determining the seam, if any pixels\n//           tie for lowest cost, the leftmost one (i.e. with the lowest\n//           column number) is used.\n//           See the project spec for details on computing the minimal seam.\nvoid find_minimal_vertical_seam(const Matrix* cost, int seam[]) {\n\n  seam[Matrix_height(cost)-1] = Matrix_column_of_min_value_in_row(cost, Matrix_height(cost)-1, 0, Matrix_width(cost));\n\n  for(int r = Matrix_height(cost)-2; r >=0; --r){\n    int c = seam[r+1];\n    seam[r] = Matrix_column_of_min_value_in_row(cost, r,\n      max(0, c-1), min(c+2, Matrix_width(cost)));\n  }\n\n}\n\n\n// REQUIRES: img points to a valid Image\n//           seam points to an array\n//           the size of seam is == Image_height(img)\n//           each element x in seam satisfies 0 <= x < Image_width(img)\n// MODIFIES: *img\n// EFFECTS:  Removes the given vertical seam from the Image. That is, one\n//           pixel will be removed from every row in the image. The pixel\n//           removed from row r will be the one with column equal to seam[r].\n//           The width of the image will be one less than before.\n//           See the project spec for details on removing a vertical seam.\nvoid remove_vertical_seam(Image *img, const int seam[]) {\n  Image aux;\n  Image_init(&aux, Image_width(img)-1, Image_height(img));\n  for(int r = 0; r < Image_height(img); ++r){\n    for(int c = 0; c < seam[r]; ++c){\n      Image_set_pixel(&aux, r, c, Image_get_pixel(img, r, c));\n    }\n    for(int c = seam[r]; c < Image_width(&aux); ++c){\n      Image_set_pixel(&aux, r, c, Image_get_pixel(img, r, c+1));\n    }\n  }\n  *img = aux;\n}\n\n\n// REQUIRES: img points to a valid Image\n//           0 < newWidth <= Image_width(img)\n// MODIFIES: *img\n// EFFECTS:  Reduces the width of the given Image to be newWidth by using\n//           the seam carving algorithm. See the spec for details.\nvoid seam_carve_width(Image *img, int newWidth) {\n  Matrix energy;\n  Matrix cost;\n  int seam[MAX_MATRIX_HEIGHT];\n  while(Image_width(img) > newWidth){\n    compute_energy_matrix(img, &energy);\n    compute_vertical_cost_matrix(&energy, &cost);\n    find_minimal_vertical_seam(&cost, seam);\n    remove_vertical_seam(img, seam);\n  }\n}\n\n// REQUIRES: img points to a valid Image\n//           0 < newHeight <= Image_height(img)\n// MODIFIES: *img\n// EFFECTS:  Reduces the height of the given Image to be newHeight.\n// NOTE:     This is equivalent to first rotating the Image 90 degrees left,\n//           then applying seam_carve_width(img, newHeight), then rotating\n//           90 degrees right.\nvoid seam_carve_height(Image *img, int newHeight) {\n  rotate_left(img);\n  seam_carve_width(img, newHeight);\n  rotate_right(img);\n}\n\n// REQUIRES: img points to a valid Image\n//           0 < newWidth <= Image_width(img)\n//           0 < newHeight <= Image_height(img)\n// MODIFIES: *img\n// EFFECTS:  Reduces the width and height of the given Image to be newWidth\n//           and newHeight, respectively.\n// NOTE:     This is equivalent to applying seam_carve_width(img, newWidth)\n//           and then applying seam_carve_height(img, newHeight).\nvoid seam_carve(Image *img, int newWidth, int newHeight) {\n  seam_carve_width(img, newWidth);\n  seam_carve_height(img, newHeight);\n}\n','2017-04-21 15:10:45'),('jjuett@umich.edu','ImageProcessing','processing.h','#ifndef PROCESSING_H\n#define PROCESSING_H\n\n#include \"Matrix.h\"\n#include \"Image.h\"\n\n// REQUIRES: img points to a valid Image\n// MODIFIES: *img\n// EFFECTS:  The image is rotated 90 degrees to the left (counterclockwise).\nvoid rotate_left(Image* img);\n\n// REQUIRES: img points to a valid Image.\n// MODIFIES: *img\n// EFFECTS:  The image is rotated 90 degrees to the right (clockwise).\nvoid rotate_right(Image* img);\n\n// REQUIRES: img points to a valid Image.\n//           energy points to a Matrix.\n// MODIFIES: *energy\n// EFFECTS:  energy serves as an \"output parameter\".\n//           The Matrix pointed to by energy is initialized to be the same\n//           size as the given Image, and then the energy matrix for that\n//           image is computed and written into it.\n//           See the project spec for details on computing the energy matrix.\nvoid compute_energy_matrix(const Image* img, Matrix* energy);\n\n// REQUIRES: energy points to a valid Matrix.\n//           cost points to a Matrix.\n//           energy and cost aren\'t pointing to the same Matrix\n// MODIFIES: *cost\n// EFFECTS:  cost serves as an \"output parameter\".\n//           The Matrix pointed to by cost is initialized to be the same\n//           size as the given energy Matrix, and then the cost matrix is\n//           computed and written into it.\n//           See the project spec for details on computing the cost matrix.\nvoid compute_vertical_cost_matrix(const Matrix* energy, Matrix *cost);\n\n// REQUIRES: cost points to a valid Matrix\n//           seam points to an array\n//           the size of seam is >= Matrix_height(cost)\n// MODIFIES: seam[0]...seam[Matrix_height(cost)-1]\n// EFFECTS:  seam serves as an \"output parameter\".\n//           The vertical seam with the minimal cost according to the given\n//           cost matrix is found and the seam array is filled with the column\n//           numbers for each pixel along the seam, starting with the lowest\n//           numbered row (top of image) and progressing to the highest\n//           (bottom of image). While determining the seam, if any pixels\n//           tie for lowest cost, the leftmost one (i.e. with the lowest\n//           column number) is used.\n//           See the project spec for details on computing the minimal seam.\nvoid find_minimal_vertical_seam(const Matrix* cost, int seam[]);\n\n// REQUIRES: img points to a valid Image\n//           Image_width(img) >= 2\n//           seam points to an array\n//           the size of seam is == Image_height(img)\n//           each element x in seam satisfies 0 <= x < Image_width(img)\n// MODIFIES: *img\n// EFFECTS:  Removes the given vertical seam from the Image. That is, one\n//           pixel will be removed from every row in the image. The pixel\n//           removed from row r will be the one with column equal to seam[r].\n//           The width of the image will be one less than before.\n//           See the project spec for details on removing a vertical seam.\nvoid remove_vertical_seam(Image *img, const int seam[]);\n\n// REQUIRES: img points to a valid Image\n//           0 < newWidth <= Image_width(img)\n// MODIFIES: *img\n// EFFECTS:  Reduces the width of the given Image to be newWidth by using\n//           the seam carving algorithm. See the spec for details.\nvoid seam_carve_width(Image *img, int newWidth);\n\n// REQUIRES: img points to a valid Image\n//           0 < newHeight <= Image_height(img)\n// MODIFIES: *img\n// EFFECTS:  Reduces the height of the given Image to be newHeight.\n// NOTE:     This is equivalent to first rotating the Image 90 degrees left,\n//           then applying seam_carve_width(img, newHeight), then rotating\n//           90 degrees right.\nvoid seam_carve_height(Image *img, int newHeight);\n\n// REQUIRES: img points to a valid Image\n//           0 < newWidth <= Image_width(img)\n//           0 < newHeight <= Image_height(img)\n// MODIFIES: *img\n// EFFECTS:  Reduces the width and height of the given Image to be newWidth\n//           and newHeight, respectively.\n// NOTE:     This is equivalent to applying seam_carve_width(img, newWidth)\n//           and then applying seam_carve_height(img, newHeight).\nvoid seam_carve(Image *img, int newWidth, int newHeight);\n\n\n#endif // PROCESSING_H','2017-04-11 21:55:46'),('jjuett@umich.edu','p1','file1','const int global = 1;\n\nclass A {\n int x; \n};\n \nint func(int x) {\n  return 2 * x;\n} \n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n/// test\n// wheee /*  sdlfkjdslfj */\nint hahaha() {\n  int x = 2;\n  int y = 3;\n  A z; \n  string w = \"temp\";\n}','2017-04-10 12:44:03'),('jjuett@umich.edu','p1','file2','#include  	 	 	 				\"file1\"\n\nconst int global2 = 15; \n\nclass A{\n  int     x;\n};\n \nint func2(int x){\n  return x;\n}\n\n\n\nint main({) {\n  int x = 3;\n     x = 3;\n  A z;\n}  ','2017-04-11 21:44:55'),('jjuett@umich.edu','p2','file3','void test(int &x){\n  cout << x << endl;\n}\n\nint main(){\n  int y = 3;\n  test(y);\n}','2017-04-16 00:57:58');
/*!40000 ALTER TABLE `user_project_files` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_projects`
--

DROP TABLE IF EXISTS `user_projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_projects` (
  `email` varchar(100) NOT NULL,
  `project` varchar(50) NOT NULL,
  `isPublic` tinyint(1) NOT NULL,
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`email`,`project`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_projects`
--

LOCK TABLES `user_projects` WRITE;
/*!40000 ALTER TABLE `user_projects` DISABLE KEYS */;
INSERT INTO `user_projects` VALUES ('jjuett@umich.edu','ImageProcessing',0,'2017-04-11 21:14:26'),('jjuett@umich.edu','p1',0,'2017-02-10 03:52:16'),('jjuett@umich.edu','p2',0,'2017-02-10 03:52:19'),('jjuett@umich.edu','p3',0,'2017-02-10 22:43:19'),('jjuett@umich.edu','undefined',0,'2017-02-21 21:31:15');
/*!40000 ALTER TABLE `user_projects` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2017-05-12 22:13:51
