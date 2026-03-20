const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const { jsPDF } = require("jspdf")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})


const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
})

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {


    const prompt = `Generate an interview report for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}
`

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(interviewReportSchema),
        }
    })

    return JSON.parse(response.text)


}



const resumeDataSchema = z.object({
    name: z.string().describe("Full name of the candidate"),
    email: z.string().optional().describe("Email address"),
    phone: z.string().optional().describe("Phone number"),
    summary: z.string().describe("Professional summary in 2-4 sentences"),
    experience: z.array(z.object({
        role: z.string().describe("Job title"),
        company: z.string().describe("Company name"),
        period: z.string().describe("Duration e.g. Jan 2020 - Present"),
        points: z.array(z.string()).describe("2-4 bullet points describing achievements and responsibilities")
    })).describe("Work experience entries, most recent first"),
    skills: z.array(z.string()).describe("List of relevant skills for the job"),
    education: z.array(z.object({
        degree: z.string().describe("Degree or certification"),
        institution: z.string().describe("School or institution name"),
        year: z.string().describe("Year or year range")
    })).optional().describe("Education entries")
})

const MARGIN = 20
const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const LINE_HEIGHT = 5
const SECTION_GAP = 8

function addWrappedText(doc, text, x, y, maxWidth, fontSize = 10) {
    doc.setFontSize(fontSize)
    const lines = doc.splitTextToSize(text, maxWidth)
    for (const line of lines) {
        if (y > PAGE_HEIGHT - MARGIN) {
            doc.addPage()
            y = MARGIN
        }
        doc.text(line, x, y)
        y += LINE_HEIGHT
    }
    return y
}

function addSectionTitle(doc, title, y) {
    if (y > PAGE_HEIGHT - MARGIN - 15) {
        doc.addPage()
        y = MARGIN
    }
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text(title, MARGIN, y)
    y += LINE_HEIGHT + 2
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    return y
}

function buildResumePdfWithJsPDF(data) {
    const doc = new jsPDF({ unit: "mm", format: "a4" })
    let y = MARGIN

    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.text(data.name, MARGIN, y)
    y += LINE_HEIGHT + 2

    const contact = [ data.email, data.phone ].filter(Boolean).join(" | ")
    if (contact) {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(10)
        doc.text(contact, MARGIN, y)
        y += LINE_HEIGHT + SECTION_GAP
    }

    y = addSectionTitle(doc, "Summary", y)
    y = addWrappedText(doc, data.summary, MARGIN, y, CONTENT_WIDTH) + SECTION_GAP

    y = addSectionTitle(doc, "Experience", y)
    for (const exp of data.experience || []) {
        if (y > PAGE_HEIGHT - MARGIN - 20) {
            doc.addPage()
            y = MARGIN
        }
        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.text(`${exp.role} at ${exp.company}`, MARGIN, y)
        y += LINE_HEIGHT
        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        doc.text(exp.period, MARGIN, y)
        y += LINE_HEIGHT
        for (const point of exp.points || []) {
            y = addWrappedText(doc, "• " + point, MARGIN + 3, y, CONTENT_WIDTH - 3, 9)
        }
        y += SECTION_GAP
    }

    if (data.skills && data.skills.length > 0) {
        y = addSectionTitle(doc, "Skills", y)
        const skillsText = data.skills.join(", ")
        y = addWrappedText(doc, skillsText, MARGIN, y, CONTENT_WIDTH) + SECTION_GAP
    }

    if (data.education && data.education.length > 0) {
        y = addSectionTitle(doc, "Education", y)
        for (const edu of data.education) {
            if (y > PAGE_HEIGHT - MARGIN - 15) {
                doc.addPage()
                y = MARGIN
            }
            doc.setFont("helvetica", "bold")
            doc.text(edu.degree, MARGIN, y)
            y += LINE_HEIGHT
            doc.setFont("helvetica", "normal")
            doc.text(`${edu.institution} — ${edu.year}`, MARGIN, y)
            y += LINE_HEIGHT + 4
        }
    }

    return Buffer.from(doc.output("arraybuffer"))
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const prompt = `Generate a tailored resume for a candidate with the following details. Return only valid JSON matching the schema.
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        The resume should be tailored for the given job description and highlight the candidate's strengths and relevant experience.
                        Keep content concise and ATS-friendly. Experience should have 2-4 bullet points per role. Summary in 2-4 sentences. Skills as a clear list.
                        Do not sound overly AI-generated; keep it professional and human. Aim for 1-2 pages when rendered as PDF.
                    `

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(resumeDataSchema),
        }
    })

    const resumeData = resumeDataSchema.parse(JSON.parse(response.text))
    const pdfBuffer = buildResumePdfWithJsPDF(resumeData)

    return pdfBuffer
}

module.exports = { generateInterviewReport, generateResumePdf }
