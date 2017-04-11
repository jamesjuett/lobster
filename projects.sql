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
INSERT INTO `user_projects` VALUES ('jjuett@umich.edu','p1',0,'2017-02-10 03:52:16'),('jjuett@umich.edu','p2',0,'2017-02-10 03:52:19'),('jjuett@umich.edu','p3',0,'2017-02-10 22:43:19'),('jjuett@umich.edu','undefined',0,'2017-02-21 21:31:15');
/*!40000 ALTER TABLE `user_projects` ENABLE KEYS */;
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
INSERT INTO `user_project_files` VALUES ('jjuett@umich.edu','p1','file1','const int global = 1;\n\nclass A {\n int x; \n};\n \nint func(int x) {\n  return 2 * x;\n} \n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n /* sdlfjdsf */\n/// test\n// wheee /*  sdlfkjdslfj */\nint hahaha() {\n  int x = 2;\n  int y = 3;\n  A z; \n  string w = \"temp\";\n}','2017-04-10 12:44:03'),('jjuett@umich.edu','p1','file2','#include  	 	 	 				\"file1\"\n\nconst int global2 = 15; \n\nclass A{\n  int     x;\n};\n \nint func2(int x){\n  return x;\n}\n\n\nint main() {\n  int x = 3;\n     x = 3;\n  A z;\n}  ','2017-04-10 12:44:03'),('jjuett@umich.edu','p2','file3','int main(){blah}\n','2017-02-10 03:55:57');
/*!40000 ALTER TABLE `user_project_files` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2017-04-11 21:10:06
