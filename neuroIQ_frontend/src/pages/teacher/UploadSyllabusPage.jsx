import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { uploadMaterial } from '../../api/ingestion.api';
import { generateTheoryQuestions } from '../../api/llm.api';
import { Button, Input, Card, CardTitle, Select } from '../../components/ui';

const UploadSyllabusPage = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: upload, 2: generating

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: {
      subject: '',
      semester: '',
      num_3marks: 3,
      num_4marks: 3,
      num_10marks: 2,
    },
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError('');
    } else {
      setSelectedFile(null);
      setError('Please select a valid PDF file');
    }
  };

  const onSubmit = async (data) => {
    if (!selectedFile) {
      setError('Please select a PDF file');
      return;
    }

    setError('');

    try {
      // Step 1: Upload to ingestion service
      setIsUploading(true);
      setStep(1);
      
      const uploadResult = await uploadMaterial(
        selectedFile,
        data.subject,
        data.semester,
        (progress) => setUploadProgress(progress)
      );

      setIsUploading(false);
      setStep(2);
      setIsGenerating(true);

      // Step 2: Generate questions using LLM service
      const questionsResult = await generateTheoryQuestions({
        material_id: uploadResult.material_id,
        extracted_text: uploadResult.extracted_text,
        subject: data.subject,
        semester: data.semester,
        num_3marks: parseInt(data.num_3marks),
        num_4marks: parseInt(data.num_4marks),
        num_10marks: parseInt(data.num_10marks),
      });

      // Navigate to generated questions page with the result
      navigate('/teacher/questions', {
        state: {
          questions: questionsResult.questions,
          materialId: uploadResult.material_id,
          subject: data.subject,
          semester: data.semester,
          pdfUrl: uploadResult.cloudinary_url,
          totalMarks: questionsResult.total_marks,
        },
      });
    } catch (err) {
      setError(err.message || 'Failed to process material');
      setIsUploading(false);
      setIsGenerating(false);
      setStep(1);
    }
  };

  const isProcessing = isUploading || isGenerating;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Syllabus</h1>
        <p className="text-gray-500 mt-1">
          Upload a PDF and generate AI-powered questions
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Subject & Semester */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Subject"
              placeholder="e.g., Data Structures"
              error={errors.subject?.message}
              disabled={isProcessing}
              {...register('subject', {
                required: 'Subject is required',
              })}
            />
            <Input
              label="Semester"
              placeholder="e.g., 4"
              error={errors.semester?.message}
              disabled={isProcessing}
              {...register('semester', {
                required: 'Semester is required',
              })}
            />
          </div>


          {/* File Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Syllabus PDF <span className="text-red-500">*</span>
            </label>
            <div
              className={`
                border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                transition-colors hover:border-indigo-400
                ${selectedFile ? 'border-green-400 bg-green-50' : 'border-gray-300'}
              `}
              onClick={() => document.getElementById('file-input').click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              {selectedFile ? (
                <div className="space-y-2">
                  <svg
                    className="mx-auto h-12 w-12 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-sm text-gray-600">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PDF up to 20MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Question Distribution */}
          <div className="space-y-4">
            <h3 className="text-base font-medium text-gray-900">Question Distribution</h3>
            <p className="text-sm text-gray-500">
              Specify how many questions to generate for each mark category
            </p>

            <div className="grid grid-cols-3 gap-4">
              <Input
                label="3 Marks"
                type="number"
                min="0"
                max="10"
                disabled={isProcessing}
                {...register('num_3marks', { min: 0, max: 10 })}
              />
              <Input
                label="4 Marks"
                type="number"
                min="0"
                max="10"
                disabled={isProcessing}
                {...register('num_4marks', { min: 0, max: 10 })}
              />
              <Input
                label="10 Marks"
                type="number"
                min="0"
                max="10"
                disabled={isProcessing}
                {...register('num_10marks', { min: 0, max: 10 })}
              />
            </div>
          </div>

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    step === 1
                      ? 'bg-indigo-600 text-white animate-pulse'
                      : 'bg-green-500 text-white'
                  }`}
                >
                  {step > 1 ? '✓' : '1'}
                </div>
                <span className={step === 1 ? 'text-gray-900' : 'text-gray-500'}>
                  Uploading PDF... {step === 1 && `${uploadProgress}%`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    step === 2
                      ? 'bg-indigo-600 text-white animate-pulse'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  2
                </div>
                <span className={step === 2 ? 'text-gray-900' : 'text-gray-500'}>
                  Generating AI questions...
                </span>
              </div>
            </div>
          )}

          {/* Submit */}
          <Button type="submit" fullWidth loading={isProcessing} disabled={isProcessing}>
            {isUploading
              ? 'Uploading...'
              : isGenerating
              ? 'Generating Questions...'
              : 'Upload & Generate Questions'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default UploadSyllabusPage;
