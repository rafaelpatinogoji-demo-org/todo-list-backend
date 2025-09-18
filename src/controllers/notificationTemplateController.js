const NotificationTemplate = require('../models/NotificationTemplate');

const f_getAllTemplates = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;
    const v_type = p_req.query.type;

    const v_filter = {};
    if (v_type) {
      v_filter.type = v_type;
    }

    const v_templates = await NotificationTemplate.find(v_filter)
      .skip(v_skip)
      .limit(v_limit);

    const v_total = await NotificationTemplate.countDocuments(v_filter);

    p_res.json({
      templates: v_templates,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalTemplates: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getTemplateById = async (p_req, p_res) => {
  try {
    const v_template = await NotificationTemplate.findById(p_req.params.id);
    if (!v_template) {
      return p_res.status(404).json({ message: 'Template not found' });
    }
    p_res.json(v_template);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_createTemplate = async (p_req, p_res) => {
  try {
    const v_template = new NotificationTemplate(p_req.body);
    const v_savedTemplate = await v_template.save();
    p_res.status(201).json(v_savedTemplate);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_updateTemplate = async (p_req, p_res) => {
  try {
    const v_template = await NotificationTemplate.findByIdAndUpdate(
      p_req.params.id,
      p_req.body,
      { new: true, runValidators: true }
    );
    if (!v_template) {
      return p_res.status(404).json({ message: 'Template not found' });
    }
    p_res.json(v_template);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_deleteTemplate = async (p_req, p_res) => {
  try {
    const v_template = await NotificationTemplate.findByIdAndDelete(p_req.params.id);
    if (!v_template) {
      return p_res.status(404).json({ message: 'Template not found' });
    }
    p_res.json({ message: 'Template deleted successfully' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllTemplates,
  f_getTemplateById,
  f_createTemplate,
  f_updateTemplate,
  f_deleteTemplate
};
