import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Grid,
  IconButton,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  School as SchoolIcon,
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  CloudUpload as UploadIcon,
  CheckCircle as CheckCircleIcon,
  PictureAsPdf as PdfIcon
} from '@mui/icons-material';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const CreateCourse = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id: courseId } = useParams();
  const isEditMode = !!courseId;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [coverPhoto, setCoverPhoto] = useState(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    department: '',
    level: 'beginner',
    isPublished: false
  });
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [existingVideos, setExistingVideos] = useState([]);

  // Track upload progress: { [localId]: { status: 'uploading'|'completed'|'error', progress: 0-100 } }
  const [uploadingItems, setUploadingItems] = useState({});

  const [chapters, setChapters] = useState([
    {
      id: 1,
      title: 'Chapter 1: Introduction',
      description: 'Get started with the basics',
      sections: [
        {
          id: 1,
          title: 'Section 1.1: Welcome',
          description: 'Introduction to the course',
          videos: []
        }
      ]
    }
  ]);

  // Load course data when in edit mode
  useEffect(() => {
    // Load meta lists
    (async () => {
      try {
        const [cats, deps] = await Promise.all([
          axios.get('/api/meta/categories'),
          axios.get('/api/meta/departments')
        ]);
        setCategories(cats?.data?.data || []);
        setDepartments(deps?.data?.data || []);
      } catch (e) {
        // ignore silently
      }
    })();
    if (isEditMode && courseId) {
      const loadCourseData = async () => {
        try {
          setLoading(true);
          const response = await axios.get(`/api/courses/${courseId}`);
          const course = response.data.data;

          // Populate form data (ensure all fields stay controlled)
          setFormData({
            title: course.title || '',
            description: course.description || '',
            category: course.category || '',
            department: course.department || '',
            level: course.level || 'beginner',
            isPublished: !!course.isPublished
          });

          // Set cover photo preview if exists
          if (course.thumbnail) {
            setCoverPhotoPreview(course.thumbnail);
          }

          // Save existing real videos for validation/matching
          setExistingVideos(Array.isArray(course.videos) ? course.videos : []);

          // Populate chapters if they exist
          if (course.chapters && Array.isArray(course.chapters)) {
            // Ensure all videos have proper structure
            const safeChapters = course.chapters.map((chapter, cIdx) => ({
              ...chapter,
              id: chapter.id || `chapter-${cIdx}-${Date.now()}`,
              sections: (chapter.sections || []).map((section, sIdx) => ({
                ...section,
                id: section.id || `section-${cIdx}-${sIdx}-${Date.now()}`,
                videos: (section.videos || []).map(video => ({
                  ...video,
                  localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  file: null, // Reset file to null for existing videos
                  fileUrl: video.fileUrl || null,
                  duration: video.duration || 0,
                  // If it has an ID, it's already uploaded
                  isUploaded: !!video.id
                }))
              }))
            }));
            setChapters(safeChapters);
          }

        } catch (error) {
          console.error('Error loading course data:', error);
          setError('Failed to load course data. Please try again.');
        } finally {
          setLoading(false);
        }
      };

      loadCourseData();
    }
  }, [isEditMode, courseId]);

  // Check if user is authorized to create courses
  if (user && user.role !== 'teacher' && user.role !== 'admin') {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {t('createCourse.accessDenied', 'Access Denied: Only teachers and administrators can create courses.')}
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/dashboard')}
          sx={{ mt: 2 }}
        >
          {t('createCourse.backToDashboard', 'Back to Dashboard')}
        </Button>
      </Container>
    );
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addFileItem = (chapterId, sectionId) => {
    const newItem = {
      id: null,
      localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: 'New File',
      description: 'File description',
      file: null,
      type: 'file',
      isUploaded: false
    };

    setChapters(chapters.map(chapter =>
      chapter.id === chapterId
        ? {
          ...chapter,
          sections: chapter.sections.map(section =>
            section.id === sectionId
              ? { ...section, videos: [...section.videos, newItem] }
              : section
          )
        }
        : chapter
    ));
  };

  const handleCoverPhotoChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file size must be less than 5MB');
        return;
      }

      setCoverPhoto(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setCoverPhotoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const addChapter = () => {
    const newChapter = {
      id: Date.now(),
      title: `Chapter ${chapters.length + 1}`,
      description: 'Chapter description',
      sections: [
        {
          id: Date.now() + 1,
          title: `Section ${chapters.length + 1}.1`,
          description: 'Section description',
          videos: []
        }
      ]
    };
    setChapters([...chapters, newChapter]);
  };

  const updateChapter = (chapterId, field, value) => {
    setChapters(chapters.map(chapter =>
      chapter.id === chapterId
        ? { ...chapter, [field]: value }
        : chapter
    ));
  };

  const deleteChapter = (chapterId) => {
    if (chapters.length > 1) {
      setChapters(chapters.filter(chapter => chapter.id !== chapterId));
    }
  };

  const addSection = (chapterId) => {
    const chapter = chapters.find(c => c.id === chapterId);
    const newSection = {
      id: Date.now(),
      title: `Section ${chapter.sections.length + 1}`,
      description: 'Section description',
      videos: []
    };

    setChapters(chapters.map(chapter =>
      chapter.id === chapterId
        ? { ...chapter, sections: [...chapter.sections, newSection] }
        : chapter
    ));
  };

  const updateSection = (chapterId, sectionId, field, value) => {
    setChapters(chapters.map(chapter =>
      chapter.id === chapterId
        ? {
          ...chapter,
          sections: chapter.sections.map(section =>
            section.id === sectionId
              ? { ...section, [field]: value }
              : section
          )
        }
        : chapter
    ));
  };

  const deleteSection = (chapterId, sectionId) => {
    const chapter = chapters.find(c => c.id === chapterId);
    if (chapter.sections.length > 1) {
      setChapters(chapters.map(chapter =>
        chapter.id === chapterId
          ? {
            ...chapter,
            sections: chapter.sections.filter(section => section.id !== sectionId)
          }
          : chapter
      ));
    }
  };

  const addVideo = (chapterId, sectionId) => {
    const newVideo = {
      id: null,
      localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: 'New Video',
      description: 'Video description',
      file: null,
      type: 'video',
      isUploaded: false
    };

    setChapters(chapters.map(chapter =>
      chapter.id === chapterId
        ? {
          ...chapter,
          sections: chapter.sections.map(section =>
            section.id === sectionId
              ? { ...section, videos: [...section.videos, newVideo] }
              : section
          )
        }
        : chapter
    ));
  };

  const updateVideo = (chapterId, sectionId, videoId, field, value) => {
    setChapters(chapters.map(chapter =>
      chapter.id === chapterId
        ? {
          ...chapter,
          sections: chapter.sections.map(section =>
            section.id === sectionId
              ? {
                ...section,
                videos: section.videos.map(video =>
                  video.id === videoId
                    ? { ...video, [field]: value }
                    : video
                )
              }
              : section
          )
        }
        : chapter
    ));
  };

  const uploadFile = async (file, type, localId) => {
    if (!file) return;

    // Set initial uploading state
    setUploadingItems(prev => ({
      ...prev,
      [localId]: { status: 'uploading', progress: 0 }
    }));

    try {
      const formData = new FormData();
      if (type === 'file') {
        formData.append('file', file);
      } else {
        formData.append('video', file);
      }

      // Inherit course info so it links properly if backend supports it; 
      // otherwise, we link explicitly later via ID in chapters payload.
      if (courseId) {
        formData.append('courseId', courseId);
      }
      // Use current filename as title for now
      formData.append('title', file.name.replace(/\.[^/.]+$/, ""));
      formData.append('description', '');

      const endpoint = type === 'file' ? '/api/files/upload' : '/api/videos/upload';

      const response = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadingItems(prev => ({
            ...prev,
            [localId]: { status: 'uploading', progress }
          }));
        }
      });

      if (response.data.success) {
        const uploadedData = response.data.data;
        const newId = uploadedData.id;
        const newUrl = uploadedData.fileUrl;
        const duration = uploadedData.duration;
        const title = uploadedData.title;

        // Update item in chapters with real ID and mark as uploaded
        setChapters(prevChapters => prevChapters.map(chapter => ({
          ...chapter,
          sections: chapter.sections.map(section => ({
            ...section,
            videos: section.videos.map(video =>
              video.localId === localId
                ? {
                  ...video,
                  id: newId,
                  fileUrl: newUrl,
                  duration: duration,
                  title: video.title === 'New Video' || video.title === 'New File' ? title : video.title,
                  isUploaded: true
                }
                : video
            )
          }))
        })));

        setUploadingItems(prev => ({
          ...prev,
          [localId]: { status: 'completed', progress: 100 }
        }));
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadingItems(prev => ({
        ...prev,
        [localId]: { status: 'error', progress: 0 }
      }));
      setError(`Failed to upload ${file.name}`);
    }
  };

  const handleVideoFileChange = (chapterId, sectionId, videoLocalId, file) => {
    if (file) {
      // Validate PDF only for file items
      const section = chapters.find(c => c.id === chapterId)?.sections.find(s => s.id === sectionId);
      const item = section?.videos.find(v => v.localId === videoLocalId);
      if (item?.type === 'file') {
        const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
        if (!isPdf) {
          setError(t('createCourse.onlyPdfAllowed', 'Only PDF files are allowed'));
          return;
        }
      }

      // Create preview URL for videos
      let previewUrl = null;
      if (file.type.startsWith('video/')) {
        previewUrl = URL.createObjectURL(file);
      }

      // Update chapter state with file info and auto-set title from filename
      const newTitle = file.name.replace(/\.[^/.]+$/, "");
      setChapters(chapters.map(chapter =>
        chapter.id === chapterId
          ? {
            ...chapter,
            sections: chapter.sections.map(section =>
              section.id === sectionId
                ? {
                  ...section,
                  videos: section.videos.map(video =>
                    video.localId === videoLocalId
                      ? {
                        ...video,
                        file: file,
                        title: newTitle,
                        previewUrl: previewUrl
                      }
                      : video
                  )
                }
                : section
            )
          }
          : chapter
      ));

      // Trigger immediate upload
      uploadFile(file, item?.type || 'video', videoLocalId);
    }
  };

  const deleteVideo = (chapterId, sectionId, videoLocalId) => {
    setChapters(chapters.map(chapter =>
      chapter.id === chapterId
        ? {
          ...chapter,
          sections: chapter.sections.map(section =>
            section.id === sectionId
              ? {
                ...section,
                videos: section.videos.filter(video => video.localId !== videoLocalId)
              }
              : section
          )
        }
        : chapter
    ));

    // Also clean up upload progress state
    setUploadingItems(prev => {
      const newState = { ...prev };
      delete newState[videoLocalId];
      return newState;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate chapters
    if (chapters.length === 0) {
      setError('Please add at least one chapter');
      return;
    }

    // Check for pending uploads
    const isAnythingUploading = Object.values(uploadingItems).some(item => item.status === 'uploading');
    if (isAnythingUploading) {
      setError('Please wait for all uploads to complete before creating the course.');
      return;
    }

    // Validate sections in chapters and ensure each new content has a valid uploaded ID
    for (let chapter of chapters) {
      if (chapter.sections.length === 0) {
        setError(`Chapter "${chapter.title}" must have at least one section`);
        return;
      }
      for (let section of chapter.sections) {
        for (let video of section.videos) {
          // It must have an ID (uploaded) or match an existing video
          if (!video.id) {
            const norm = (s) => String(s || '').trim().toLowerCase();
            const matched = existingVideos.some(v =>
              (video.id && String(v.id) === String(video.id)) ||
              (video.title && norm(v.title) === norm(video.title))
            );
            if (!matched) {
              setError(`${video.type === 'file' ? 'File' : 'Video'} "${video.title}" in Section "${section.title}" must be uploaded fully before saving.`);
              return;
            }
          }
        }
      }
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let thumbnailUrl = null;

      // Upload cover photo if provided
      if (coverPhoto) {
        const formDataCover = new FormData();
        formDataCover.append('thumbnail', coverPhoto);

        const uploadResponse = await axios.post('/api/courses/upload-thumbnail', formDataCover, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        thumbnailUrl = uploadResponse.data.data.url;
      }

      let currentCourseId = courseId;

      // Prepare data, using the IDs we got from uplods
      const courseData = {
        ...formData,
        chapters: chapters.map(chapter => ({
          title: chapter.title,
          description: chapter.description,
          sections: chapter.sections.map(section => ({
            title: section.title,
            description: section.description,
            videos: section.videos.map(video => ({
              id: video.id, // This should be populated now
              title: video.title,
              description: video.description,
              type: video.type || 'video',
              fileUrl: video.fileUrl,
              duration: video.duration
            }))
          }))
        }))
      };

      if (thumbnailUrl) {
        courseData.thumbnail = thumbnailUrl;
      }

      if (isEditMode) {
        // Update existing course
        const response = await axios.put(`/api/courses/${courseId}`, courseData);
        console.log('Course update response:', response.data);
        setSuccess('Course updated successfully!');
      } else {
        // Create new course
        const response = await axios.post('/api/courses', courseData);
        currentCourseId = response.data.data?.id || response.data.id;
        console.log('Course creation response:', response.data);
        setSuccess('Course created successfully!');
      }

      // If publish toggle is on
      if (formData.isPublished && currentCourseId) {
        try {
          const token = localStorage.getItem('token');
          if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          }
          await axios.put(`/api/courses/${currentCourseId}`, { isPublished: true });
          setSuccess('Course published successfully!');
        } catch (e) {
          const msg = e?.response?.data?.message || '';
          if (e?.response?.status === 400 && /processing|finish processing/i.test(msg)) {
            setSuccess('Course created as draft. Videos are still processing; please publish after processing completes.');
          } else {
            setSuccess('Course created. you can publish it from the Teacher Dashboard');
          }
        }
      }

      // Redirect
      setTimeout(() => {
        if (currentCourseId) {
          navigate(`/course/${currentCourseId}`, { state: { ownerJustCreated: true } });
        } else {
          navigate('/dashboard');
        }
      }, 600);

    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} course:`, error);
      setError(error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} course. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate if the Create Course button should be disabled
  // Disabled if: global loading, OR any item is currently uploading, OR any item has a file selected but not yet uploaded (no ID) and is not in error state
  const isSubmitDisabled = loading || chapters.some(chapter =>
    chapter.sections.some(section =>
      section.videos.some(video => {
        const uploadState = uploadingItems[video.localId];
        // If file is selected but no ID yet, we are waiting for upload unless it failed
        const waitingForUpload = video.file && !video.id && (!uploadState || uploadState.status !== 'error');
        return waitingForUpload;
      })
    )
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard')}
          sx={{ mb: 2 }}
        >
          {t('createCourse.backToDashboard', 'Back to Dashboard')}
        </Button>

        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          {isEditMode ? t('createCourse.headerEdit', 'Edit Course') : t('createCourse.headerCreate', 'Create New Course')}
        </Typography>
        <Typography variant="body1" color="textSecondary">
          {isEditMode
            ? t('createCourse.headerSubEdit', 'Update your course content, structure, and materials')
            : t('createCourse.headerSubCreate', 'Organize your content into chapters, sections, and videos for structured learning')
          }
        </Typography>
      </Box>

      <form onSubmit={handleSubmit}>
        {/* Basic Course Information */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
              {t('createCourse.basicInfo', 'Basic Course Information')}
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('createCourse.title', 'Course Title')}
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  required
                  placeholder={t('createCourse.titlePh', 'e.g., Complete Web Development Bootcamp')}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label={t('createCourse.description', 'Course Description')}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  required
                  placeholder={t('createCourse.descriptionPh', 'Describe what students will learn in this course')}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>{t('createCourse.categoryOpt', 'Category (optional)')}</InputLabel>
                  <Select
                    value={formData.category || ''}
                    label={t('createCourse.categoryOpt', 'Category (optional)')}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    displayEmpty
                    renderValue={(v) => v || '—'}
                  >
                    <MenuItem value="">{'—'}</MenuItem>
                    {categories.map((c) => (
                      <MenuItem key={c.id} value={c.name}>{c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>{t('createCourse.departmentOpt', 'Department (optional)')}</InputLabel>
                  <Select
                    value={formData.department || ''}
                    label={t('createCourse.departmentOpt', 'Department (optional)')}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    displayEmpty
                    renderValue={(v) => v || '—'}
                  >
                    <MenuItem value="">{'—'}</MenuItem>
                    {departments.map((d) => (
                      <MenuItem key={d.id} value={d.name}>{d.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>{t('createCourse.level', 'Difficulty Level')}</InputLabel>
                  <Select
                    value={formData.level}
                    onChange={(e) => handleInputChange('level', e.target.value)}
                    label={t('createCourse.level', 'Difficulty Level')}
                  >
                    <MenuItem value="beginner">{t('createCourse.levelBeginner', 'Beginner')}</MenuItem>
                    <MenuItem value="intermediate">{t('createCourse.levelIntermediate', 'Intermediate')}</MenuItem>
                    <MenuItem value="advanced">{t('createCourse.levelAdvanced', 'Advanced')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch checked={!!formData.isPublished} onChange={(e) => handleInputChange('isPublished', e.target.checked)} />}
                  label={t('createCourse.publish', 'Publish course')}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {t('createCourse.coverPhoto', 'Course Cover Photo')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadIcon />}
                    sx={{ minWidth: 200 }}
                  >
                    {t('createCourse.chooseCover', 'Choose Cover Photo')}
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleCoverPhotoChange}
                    />
                  </Button>
                  {coverPhoto && (
                    <Typography variant="body2" color="textSecondary">
                      {coverPhoto.name}
                    </Typography>
                  )}
                </Box>
                {coverPhotoPreview && (
                  <Box sx={{ mt: 2 }}>
                    <img
                      src={coverPhotoPreview}
                      alt="Cover preview"
                      style={{
                        maxWidth: '300px',
                        maxHeight: '200px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid #ddd'
                      }}
                    />
                  </Box>
                )}
              </Grid>

            </Grid>
          </CardContent>
        </Card>

        {/* Course Chapters, Sections and Videos */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {t('createCourse.structure', 'Course Structure: Chapters → Sections → Videos')}
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addChapter}
              >
                {t('createCourse.addChapter', 'Add Chapter')}
              </Button>
            </Box>

            {chapters.map((chapter, chapterIndex) => (
              <Accordion key={chapter.id} defaultExpanded sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" alignItems="center" gap={2} sx={{ width: '100%' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      Chapter {chapterIndex + 1}: {chapter.title}
                    </Typography>
                    <Chip
                      label={`${chapter.sections.length} sections`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={t('createCourse.chapterTitle', 'Chapter Title')}
                        value={chapter.title}
                        onChange={(e) => updateChapter(chapter.id, 'title', e.target.value)}
                        placeholder={t('createCourse.chapterTitlePh', 'e.g., Chapter 1: Introduction to HTML')}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={t('createCourse.chapterDesc', 'Chapter Description')}
                        value={chapter.description}
                        onChange={(e) => updateChapter(chapter.id, 'description', e.target.value)}
                        placeholder={t('createCourse.chapterDescPh', 'Brief description of this chapter')}
                      />
                    </Grid>
                  </Grid>

                  <Box sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {t('createCourse.sectionsInChapter', 'Sections in this Chapter')}
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => addSection(chapter.id)}
                      >
                        {t('createCourse.addSection', 'Add Section')}
                      </Button>
                    </Box>

                    {chapter.sections.map((section, sectionIndex) => (
                      <Accordion key={section.id} sx={{ mb: 1 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box display="flex" alignItems="center" gap={2} sx={{ width: '100%' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                              Section {chapterIndex + 1}.{sectionIndex + 1}: {section.title}
                            </Typography>
                            <Chip
                              label={`${section.videos.length} videos`}
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                size="small"
                                label={t('createCourse.sectionTitle', 'Section Title')}
                                value={section.title}
                                onChange={(e) => updateSection(chapter.id, section.id, 'title', e.target.value)}
                                placeholder={t('createCourse.sectionTitlePh', 'e.g., Section 1.1: HTML Basics')}
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                size="small"
                                label={t('createCourse.sectionDesc', 'Section Description')}
                                value={section.description}
                                onChange={(e) => updateSection(chapter.id, section.id, 'description', e.target.value)}
                                placeholder={t('createCourse.sectionDescPh', 'Brief description of this section')}
                              />
                            </Grid>
                          </Grid>

                          <Box sx={{ mb: 2 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                {t('createCourse.contentInSection', 'Content in this Section')}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<AddIcon />}
                                  onClick={() => addVideo(chapter.id, section.id)}
                                >
                                  {t('createCourse.addVideo', 'Add Video')}
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<AddIcon />}
                                  onClick={() => addFileItem(chapter.id, section.id)}
                                >
                                  {t('createCourse.addFile', 'Add File')}
                                </Button>
                              </Box>
                            </Box>

                            {section.videos.map((video, videoIndex) => {
                              const uploadState = uploadingItems[video.localId];
                              const isUploading = uploadState?.status === 'uploading';
                              const isUploaded = video.id || (uploadState?.status === 'completed');

                              return (
                                <Card key={`${video.id || video.localId || video.title || 'item'}-${videoIndex}`} variant="outlined" sx={{ mb: 1 }}>
                                  <CardContent>
                                    <Grid container spacing={2} alignItems="center">
                                      <Grid item xs={12} sm={4}>
                                        <TextField
                                          fullWidth
                                          size="small"
                                          label={video.type === 'file' ? t('createCourse.fileTitle', 'File Title') : t('createCourse.videoTitle', 'Video Title')}
                                          value={video.title}
                                          onChange={(e) => updateVideo(chapter.id, section.id, video.localId, 'title', e.target.value)}
                                          placeholder={video.type === 'file' ? t('createCourse.fileTitlePh', 'File title') : t('createCourse.videoTitlePh', 'Video title')}
                                        />
                                      </Grid>
                                      <Grid item xs={12} sm={6}>
                                        <Box display="flex" alignItems="center" gap={2}>
                                          <Button
                                            variant="outlined"
                                            component="label"
                                            size="small"
                                            startIcon={<UploadIcon />}
                                            disabled={isUploading}
                                            sx={{ minWidth: 160 }}
                                          >
                                            {video.file
                                              ? (isUploaded ? t('createCourse.changeFile', 'Change File') : video.file.name.substring(0, 15) + '...')
                                              : (video.type === 'file' ? t('createCourse.selectFile', 'Select PDF') : t('createCourse.selectVideo', 'Select Video'))
                                            }
                                            <input
                                              type="file"
                                              hidden
                                              accept={video.type === 'file' ? 'application/pdf,.pdf' : 'video/*'}
                                              onChange={(e) => handleVideoFileChange(chapter.id, section.id, video.localId, e.target.files[0])}
                                            />
                                          </Button>

                                          {/* Thumbnail Preview */}
                                          {video.file && (
                                            <Box sx={{
                                              width: 48,
                                              height: 48,
                                              borderRadius: 1,
                                              overflow: 'hidden',
                                              border: '1px solid #ddd',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              bgcolor: '#f5f5f5',
                                              flexShrink: 0
                                            }}>
                                              {video.type === 'file' ? (
                                                <PdfIcon color="error" />
                                              ) : (
                                                video.previewUrl ? (
                                                  <video
                                                    src={video.previewUrl}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                  />
                                                ) : (
                                                  <UploadIcon color="action" />
                                                )
                                              )}
                                            </Box>
                                          )}

                                          {/* Status Indicator */}
                                          <Box sx={{ flexGrow: 1, minWidth: 80 }}>
                                            {isUploading ? (
                                              <Box>
                                                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                                  <CircularProgress size={16} />
                                                  <Typography variant="caption" color="textSecondary">
                                                    {uploadState.progress}%
                                                  </Typography>
                                                </Box>
                                                <div style={{ width: '100%', height: 4, background: '#eee', borderRadius: 2 }}>
                                                  <div style={{ width: `${uploadState.progress}%`, height: '100%', background: '#1976d2', borderRadius: 2, transition: 'width 0.2s' }} />
                                                </div>
                                              </Box>
                                            ) : (
                                              isUploaded ? (
                                                <Typography variant="body2" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 'medium' }}>
                                                  <CheckCircleIcon fontSize="small" />
                                                  {t('createCourse.uploaded', 'Uploaded')}
                                                </Typography>
                                              ) : (
                                                uploadState?.status === 'error' && (
                                                  <Typography variant="caption" color="error">
                                                    Upload Failed
                                                  </Typography>
                                                )
                                              )
                                            )}
                                          </Box>
                                        </Box>
                                      </Grid>
                                      <Grid item xs={12} sm={2}>
                                        <Box display="flex" justifyContent="flex-end">
                                          <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => deleteVideo(chapter.id, section.id, video.localId)}
                                          >
                                            <DeleteIcon />
                                          </IconButton>
                                        </Box>
                                      </Grid>
                                    </Grid>

                                    {video.file && (
                                      <Box sx={{ mt: 1 }}>
                                        <TextField
                                          fullWidth
                                          size="small"
                                          label={video.type === 'file' ? t('createCourse.fileDesc', 'File Description') : t('createCourse.videoDesc', 'Video Description')}
                                          value={video.description}
                                          onChange={(e) => updateVideo(chapter.id, section.id, video.localId, 'description', e.target.value)}
                                          placeholder={video.type === 'file' ? t('createCourse.fileDescPh', 'Brief description of this file') : t('createCourse.videoDescPh', 'Brief description of this video')}
                                        />
                                      </Box>
                                    )}

                                  </CardContent>
                                </Card>
                              );
                            })}
                          </Box>

                          {chapter.sections.length > 1 && (
                            <Button
                              variant="outlined"
                              color="error"
                              startIcon={<DeleteIcon />}
                              onClick={() => deleteSection(chapter.id, section.id)}
                              size="small"
                            >
                              {t('createCourse.deleteSection', 'Delete Section')}
                            </Button>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Box>

                  {chapters.length > 1 && (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => deleteChapter(chapter.id)}
                      size="small"
                    >
                      {t('createCourse.deleteChapter', 'Delete Chapter')}
                    </Button>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Box display="flex" justifyContent="center" sx={{ mb: 4 }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            // Button is disabled if: loading (submitting), OR uploads are in progress, OR uploads are pending (file selected but no ID)
            disabled={isSubmitDisabled}
            startIcon={loading ? <CircularProgress size={20} /> : <SchoolIcon />}
            sx={{ px: 4, py: 1.5 }}
          >
            {loading
              ? (isEditMode ? t('createCourse.submitUpdating', 'Updating Course...') : t('createCourse.submitCreating', 'Creating Course...'))
              : (isSubmitDisabled
                ? (Object.values(uploadingItems).some(i => i.status === 'uploading')
                  ? 'Wait for uploads...'
                  : (isEditMode ? t('createCourse.submitUpdate', 'Update Course') : t('createCourse.submitCreate', 'Create Course'))
                )
                : (isEditMode ? t('createCourse.submitUpdate', 'Update Course') : t('createCourse.submitCreate', 'Create Course'))
              )
            }
          </Button>
        </Box>
      </form>

      {/* Error and Success Messages */}
      {
        error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )
      }

      {
        success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )
      }
    </Container >
  );
};

export default CreateCourse;
