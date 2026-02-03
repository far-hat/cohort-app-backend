import AppDataSource from "../db/dataSource";
import { Request, Response } from "express";
import { User } from "../entities/User";
import { Course, CourseStatus } from "../entities/Courses";

const courseRepository = AppDataSource.getRepository(Course);

export const CreateCourse = async (req: Request, res: Response) => {
    try {
        const auth0Id = req.auth?.auth0Id;
        if (!auth0Id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        //const auth0Id = req.body.auth0Id;

        const user = await AppDataSource.getRepository(User).findOne({
            where: { auth0Id },
            relations: ["mentor"]
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.role !== "mentor") {
            return res.status(403).json({ message: "Forbidden. Only mentors can create course" });
        }

        if (!user.mentor) {
            return res.status(404).json({ message: "Mentor info not found" });
        }

        const course = courseRepository.create({
            course_title: req.body.course_title,
            description: req.body.description,
            status: CourseStatus.DRAFT,
            mentor: user.mentor,
        });
        await courseRepository.save(course);
        return res.status(201).json(course);

    } catch (error) {
        console.log("Error creating course");
        return res.status(500).send({ message: "Error creating course", error });
    }


}

export const ViewCourses = async (req: Request, res: Response) => {
    try {
        const auth0Id = req.auth?.auth0Id;
        if (!auth0Id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const user = await AppDataSource.getRepository(User).findOne({
            where: { auth0Id },
            relations: ["mentor"]
        });

        if (!user) {
            return res.sendStatus(401);
        }

        if (user.role !== "mentor") {
            return res.sendStatus(403);
        }

        if (!user.mentor) {
            return res.sendStatus(404);
        }

        const courses = await courseRepository.find({
            where: {
                mentor: {
                    mentor_id: user.mentor.mentor_id
                }
            },
        })
        if (!courses) return res.sendStatus(404);

        return res.status(200).json(courses);
    } catch (er) {
        return res.sendStatus(500)
    }
}

export const ViewCourseById = async (req: Request, res: Response) => {
    try {
        const auth0Id = req.auth?.auth0Id;
        if (!auth0Id) {
            return res.status(401).json({ message: "Unauthorized" });
        } const courseId = Number(req.params.id);

        if (!courseId) return res.status(404).json("Course Id not found");

        const user = await AppDataSource.getRepository(User).findOne({
            where: { auth0Id },
            relations: ["mentor"]
        });

        if (!user) {
            return res.sendStatus(401);
        }

        if (user.role !== "mentor") {
            return res.sendStatus(403);
        }

        if (!user.mentor) {
            return res.sendStatus(404);
        }

        const course = await courseRepository.findOne({
            where: { course_id: courseId },
            relations: ["cohorts"]
        })
        if (!course) return res.sendStatus(404);
        console.log(course);

        return res.status(200).json(course);
    } catch (er) {
        return res.sendStatus(500)
    }
}